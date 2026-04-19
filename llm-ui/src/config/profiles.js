export const defaultProfiles = [
    {
        id: "openai",
        name: "OpenAI",
        endpoint: "https://api.openai.com/v1/chat/completions",
        contextMessageCount: 20,
    },
    {
        id: "gemini",
        name: "Gemini",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/",
        contextMessageCount: 20,
    }
];

export const getActiveProfile = () => {
    const saved = localStorage.getItem("activeProfileId");
    return defaultProfiles.find(p => p.id === saved) || defaultProfiles[0];
};