import { SparkleIcon, MeshIcon, GraduationCapIcon, SearchIcon } from "../components/icons";

export const claude = [
    {
        id: 'claude-haiku',
        title: 'Haiku',
        tag: 'Haiku 3.5',
        val: 'claude-3-5-haiku-20241022',
        desc: 'Fast and lightweight Claude model',
        default: false,
        icon: <SearchIcon />
    },
    {
        id: 'claude-sonnet',
        title: 'Sonnet',
        tag: 'Sonnet 4',
        val: 'claude-sonnet-4-20250514',
        desc: 'Balanced Claude model for everyday work',
        default: true,
        icon: <SparkleIcon />
    },
    {
        id: 'claude-opus',
        title: 'Opus',
        tag: 'Sonnet 3.7',
        val: 'claude-3-7-sonnet-20250219',
        desc: 'Strong for reasoning-heavy prompts',
        default: false,
        icon: <SparkleIcon />
    }
];
