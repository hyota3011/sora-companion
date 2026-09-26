import { SearchIcon, SparkleIcon, ZapIcon, GraduationCapIcon, BrainIcon } from "../components/icons";

export const openai = [
    {
        id: 'luna',
        title: 'luna',
        tag: 'GPT-6 Luna',
        val: 'gpt-6-luna',
        desc: 'Our most efficient model for focused, high-volume tasks',
        default: true,
        icon: <ZapIcon />
    },
    {
        id: 'sol',
        title: 'sol',
        tag: 'GPT-6 Sol',
        val: 'gpt-6-sol',
        desc: 'Built to power complex coding and agentic workflows',
        default: false,
        icon: <SparkleIcon />
    },
    {
        id: 'Astra',
        title: 'Astra',
        tag: 'GPT-6 Astra',
        val: 'gpt-6-astra',
        desc: 'Our most capable model, built for the hardest end-to-end work',
        default: false,
        icon: <BrainIcon />
    }
];
