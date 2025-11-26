// api/generateAudio.js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  // Load secrets from Vercel environment
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const title = "Audiobook-" + Date.now();

  try {
    // --- OPENAI GENERATE AUDIO ---
    const audioResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: text,
      }),
    });

    if (!audioResponse.ok) {
      return res.status(500).json({ error: "OpenAI audio generation failed" });
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // --- UPLOAD TO SUPABASE ---
    const { error: uploadError } = await supabase.storage
      .from("audiobooks")
      .upload(`${title}.mp3`, audioBuffer, {
        contentType: "audio/mpeg",
      });

    if (uploadError) {
      return res.status(500).json({ error: uploadError.message });
    }

    const { data } = supabase
      .storage
      .from("audiobooks")
      .getPublicUrl(`${title}.mp3`);

    return res.status(200).json({
      audioUrl: data.publicUrl,
      title,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
