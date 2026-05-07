import { SparkleIcon, MeshIcon, GraduationCapIcon, SearchIcon } from "../components/icons";

export const claude = [
    {
        id: 'claude-haiku',
        title: 'Fast',
        tag: 'Haiku 3.5',
        val: 'claude-3-5-haiku-20241022',
        desc: 'Fast and lightweight Claude model',
        default: false,
        icon: <SearchIcon />
    },
    {
        id: 'claude-sonnet',
        title: 'Smart',
        tag: 'Sonnet 4',
        val: 'claude-sonnet-4-20250514',
        desc: 'Balanced Claude model for everyday work',
        default: true,
        icon: <SparkleIcon />
    },
    {
        id: 'claude-reasoning',
        title: 'Reasoning',
        tag: 'Sonnet 3.7',
        val: 'claude-3-7-sonnet-20250219',
        desc: 'Strong for reasoning-heavy prompts',
        default: false,
        icon: <GraduationCapIcon />
    },
    {
        id: 'claude-opus',
        title: 'Think deeper',
        tag: 'Opus 4.1',
        val: 'claude-opus-4-1-20250805',
        desc: 'Highest capability Claude model',
        default: false,
        icon: <MeshIcon />
    }
];
