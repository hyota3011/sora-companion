import { ZapIcon, SparkleIcon, BrainIcon } from "../components/icons";

export const claude = [
    {
        id: 'claude-haiku',
        title: 'Haiku',
        tag: 'Haiku 4.5',
        val: 'claude-haiku-4-5',
        desc: 'Fast and lightweight — ideal for quick tasks',
        default: true,
        icon: <ZapIcon />
    },
    {
        id: 'claude-sonnet',
        title: 'Sonnet',
        tag: 'Sonnet 5',
        val: 'claude-sonnet-5',
        desc: 'Balanced performance for everyday work',
        default: false,
        icon: <SparkleIcon />
    },
    {
        id: 'claude-opus',
        title: 'Opus',
        tag: 'Opus 4.8',
        val: 'claude-opus-4-8',
        desc: 'Most intelligent — excels at complex reasoning',
        default: false,
        icon: <BrainIcon />
    }
];
