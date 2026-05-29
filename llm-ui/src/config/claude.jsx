import { ZapIcon, SparkleIcon, BrainIcon } from "../components/icons";

export const claude = [
    {
        id: 'claude-haiku',
        title: 'Haiku',
        tag: 'Haiku 4.5',
        val: 'claude-haiku-4-5-20251001',
        desc: 'Fast and lightweight — ideal for quick tasks',
        default: true,
        icon: <ZapIcon />
    },
    {
        id: 'claude-sonnet',
        title: 'Sonnet',
        tag: 'Sonnet 4.6',
        val: 'claude-sonnet-4-6',
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
