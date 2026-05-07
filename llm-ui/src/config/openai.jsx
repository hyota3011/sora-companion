import { SearchIcon, ZapIcon, GraduationCapIcon, BrainIcon } from "../components/icons";

export const openai = [
    {
        id: 'search',
        title: 'Search',
        tag: 'GPT-5 Nano',
        val: 'gpt-5-nano',
        desc: 'Quick answers with web-enhanced references',
        default: false,
        icon: <SearchIcon />
    },
    {
        id: 'smart',
        title: 'Smart',
        tag: 'GPT-5 Mini',
        val: 'gpt-5-mini',
        desc: 'Fast and capable for everyday tasks',
        default: true,
        icon: <ZapIcon />
    },
    {
        id: 'learn',
        title: 'Study',
        tag: 'GPT-5.2',
        val: 'gpt-5.2',
        desc: 'Guided learning, quizzes, and explanations',
        default: false,
        icon: <GraduationCapIcon />
    },
    {
        id: 'deeper',
        title: 'Think Deeper',
        tag: 'GPT-5.2 Pro',
        val: 'gpt-5.2-pro',
        desc: 'Deep reasoning for complex problems',
        default: false,
        icon: <BrainIcon />
    }
];
