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

/**
 * Resolves the active provider profile saved for the current browser origin.
 * @returns {Object} The matching provider profile, or the default profile.
 */
export const getActiveProfile = () => {
    const saved = localStorage.getItem("activeProfileId");
    return defaultProfiles.find(p => p.id.toLowerCase() === saved?.toLowerCase()) || defaultProfiles[0];
};
