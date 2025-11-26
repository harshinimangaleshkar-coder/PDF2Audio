import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Initialize Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- GOOGLE LOGIN ----------
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://pdf-2-audio-five.vercel.app",
    },
  });

  if (error) {
    console.error("Google Login Error:", error);
    alert("Google Login Failed: " + error.message);
  }
}

// ---------- LOGOUT ----------
export async function logoutUser() {
  await supabase.auth.signOut();
  window.location.reload();
}

// ---------- AUTH STATE ----------
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    document.getElementById("user-email").innerText = session.user.email;
    loadBooks(session.user);
  } else {
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("dashboard").classList.add("hidden");
  }
});

// ---------- LOAD AUDIOBOOKS ----------
async function loadBooks(user) {
  const booksList = document.getElementById("books-list");
  const status = document.getElementById("status");

  booksList.innerHTML = "Loading…";

  const { data } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id);

  booksList.innerHTML = "";

  data.forEach((b) => {
    const div = document.createElement("div");
    div.className = "book-item";
    div.innerHTML = `
      <span>${b.title}</span>
      <a href="${b.audio_url}" target="_blank">▶️ Listen</a>
    `;
    booksList.appendChild(div);
  });

  if (data.length >= 3) {
    document.getElementById("convert-btn").disabled = true;
    status.innerText = "You reached your 3-book limit.";
  } else {
    document.getElementById("convert-btn").disabled = false;
    status.innerText = "";
  }
}

// ---------- PDF → AUDIO ----------
export async function convertPdfToAudio() {
  const file = document.getElementById("pdf-upload").files[0];
  if (!file) return alert("Upload a PDF first!");

  const status = document.getElementById("status");
  status.innerText = "Extracting text…";

  const text = await file.text();

  status.innerText = "Generating audio…";

  const response = await fetch("/api/generateAudio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const { audioUrl, title } = await response.json();

  const user = (await supabase.auth.getUser()).data.user;

  status.innerText = "Saving…";

  await supabase.from("books").insert({
    user_id: user.id,
    title,
    audio_url: audioUrl,
  });

  status.innerText = "Done!";
  loadBooks(user);
}

// ---------- ATTACH BUTTONS ----------
document.addEventListener("DOMContentLoaded", () => {
  const googleBtn = document.getElementById("googleBtn");
  if (googleBtn) googleBtn.onclick = signInWithGoogle;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.onclick = logoutUser;

  const convertBtn = document.getElementById("convert-btn");
  if (convertBtn) convertBtn.onclick = convertPdfToAudio;
});
