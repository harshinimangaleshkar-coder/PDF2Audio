import { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
    const { text } = req.body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const title = "Audiobook-" + Date.now();

    const audioResponse = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini-tts",
            voice: "alloy",
            input: text
        })
    });

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    await supabase.storage
        .from("audiobooks")
        .upload(`${title}.mp3`, audioBuffer, {
            contentType: "audio/mpeg"
        });

    const { data: publicUrl } = supabase.storage
        .from("audiobooks")
        .getPublicUrl(`${title}.mp3`);

    return res.status(200).json({
        audioUrl: publicUrl.publicUrl,
        title
    });
}
