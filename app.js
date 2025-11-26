import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authSection = document.getElementById("auth-section");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("google-login");
const logoutBtn = document.getElementById("logout-btn");
const userEmailSpan = document.getElementById("user-email");
const convertBtn = document.getElementById("convert-btn");
const uploadInput = document.getElementById("pdf-upload");
const statusText = document.getElementById("status");
const booksList = document.getElementById("books-list");

loginBtn.addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({
        provider: "google"
    });
});

logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showAuth();
});

supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
        showDashboard(session.user);
    } else {
        showAuth();
    }
});

function showAuth() {
    authSection.classList.remove("hidden");
    dashboard.classList.add("hidden");
}

function showDashboard(user) {
    authSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    userEmailSpan.textContent = user.email;
    loadBooks(user);
}

async function loadBooks(user) {
    booksList.innerHTML = "Loading…";

    const { data } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", user.id);

    booksList.innerHTML = "";

    data.forEach(book => {
        const div = document.createElement("div");
        div.className = "book-item";
        div.innerHTML = `
            <span>${book.title}</span>
            <a href="${book.audio_url}" target="_blank">▶️ Listen</a>
        `;
        booksList.appendChild(div);
    });

    if (data.length >= 3) {
        convertBtn.disabled = true;
        statusText.textContent = "You reached your 3-book limit.";
    } else {
        convertBtn.disabled = false;
        statusText.textContent = "";
    }
}

convertBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    if (!file) return alert("Upload a PDF first!");

    statusText.textContent = "Extracting text…";

    const text = await file.text();
    statusText.textContent = "Generating audio…";

    const response = await fetch("/api/generateAudio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });

    const { audioUrl, title } = await response.json();

    statusText.textContent = "Saving…";

    const user = (await supabase.auth.getUser()).data.user;

    await supabase.from("books").insert({
        user_id: user.id,
        title: title,
        audio_url: audioUrl
    });

    statusText.textContent = "Done!";
    loadBooks(user);
});
