import { getApiKey, saveApiKey } from "../api/keys";

export const provider = {
    OPENAI: "openai",
    //GEMINI: "gemini",
    CLAUDE: "claude",
    GROK: "grok"
};

export const defaultProfiles = [
    {
        id: provider.OPENAI,
        name: "OpenAI",
        endpoint: "https://api.openai.com/v1/chat/completions",
        contextMessageCount: 20,
    },
    // {
    //     id: provider.GEMINI,
    //     name: "Gemini",
    //     endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/",
    //     contextMessageCount: 20,
    // },
    {
        id: provider.GROK,
        name: "Grok",
        endpoint: "https://api.x.ai/v1/chat/completions",
        contextMessageCount: 20,
    },
    {
        id: provider.CLAUDE,
        name: "Claude",
        endpoint: "https://api.anthropic.com/v1/messages",
        contextMessageCount: 20,
        maxTokens: 4096,
    }
];

export const getActiveProfile = () => {
    const saved = localStorage.getItem("activeProfileId");
    return defaultProfiles.find(p => p.id.toLowerCase() === saved?.toLowerCase()) || defaultProfiles[0];
};

function getFromEnv(id) {
    switch (id) {
        case provider.CLAUDE:
            return import.meta.env.VITE_ANTHROPIC_KEY;
        case provider.GROK:
            return import.meta.env.VITE_XAI_KEY;
        case provider.OPENAI:
            return import.meta.env.VITE_OPENAI_KEY;
        default:
            return null;
    }
}

export async function _getApiKey(profileId) {
    const profile = profileId
        ? defaultProfiles.find(p => p.id.toLowerCase() === profileId.toLowerCase())
        : getActiveProfile();
    if (!profile || !profile.id) return null;
    let key = await getApiKey(profile.id);
    if (!key) {
        key = getFromEnv(profile.id);
        if (key) {
            await saveApiKey(profile.id, key);
        }
    }
    return key;
}
