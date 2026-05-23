import { SearchIcon, ZapIcon, GraduationCapIcon, BrainIcon } from "../components/icons";

export const openai = [
    {
        id: 'search',
        title: 'Search',
        tag: 'GPT-5.4 Nano',
        val: 'gpt-5.4-nano',
        desc: 'Quick answers with web-enhanced references',
        default: false,
        icon: <SearchIcon />
    },
    {
        id: 'smart',
        title: 'Smart',
        tag: 'GPT-5.4 Mini',
        val: 'gpt-5.4-mini',
        desc: 'Fast and capable for everyday tasks',
        default: true,
        icon: <ZapIcon />
    },
    {
        id: 'learn',
        title: 'Study',
        tag: 'GPT-5.5',
        val: 'gpt-5.5',
        desc: 'Guided learning, quizzes, and explanations',
        default: false,
        icon: <GraduationCapIcon />
    },
    {
        id: 'deeper',
        title: 'Think Deeper',
        tag: 'GPT-5.5 Pro',
        val: 'gpt-5.5-pro',
        desc: 'Deep reasoning for complex problems',
        default: false,
        icon: <BrainIcon />
    }
];
