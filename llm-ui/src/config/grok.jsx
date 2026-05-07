import { ZapIcon, SparkleIcon, BrainIcon, ImageIcon, PictureIcon } from "../components/icons";

export const grok = [
    {
        id: 'grok-4-1-fast-non-reasoning',
        title: 'Fast',
        tag: 'Grok 4.1 Fast',
        val: 'grok-4-1-fast-non-reasoning',
        desc: 'Snappy responses for quick, everyday tasks',
        default: true,
        icon: <ZapIcon />
    },
    {
        id: 'grok-4.20-0309-reasoning',
        title: 'Reasoning',
        tag: 'Grok 4.20 Thinking',
        val: 'grok-4.20-0309-reasoning',
        desc: 'Thinks step-by-step through hard problems',
        default: false,
        icon: <BrainIcon />
    },
    {
        id: 'grok-4.20-0309-non-reasoning',
        title: 'Grok 4.20',
        tag: 'Grok 4.20',
        val: 'grok-4.20-0309-non-reasoning',
        desc: 'Balanced and capable for most use cases',
        default: false,
        icon: <SparkleIcon />
    },
    {
        id: 'grok-imagine-image',
        title: 'Imagine',
        tag: 'Grok Image',
        val: 'grok-imagine-image',
        desc: 'Generate images from text prompts',
        default: false,
        icon: <ImageIcon />
    },
    {
        id: 'grok-imagine-image-pro',
        title: 'Imagine Pro',
        tag: 'Grok Image Pro',
        val: 'grok-imagine-image-pro',
        desc: 'High-quality, detailed image generation',
        default: false,
        icon: <PictureIcon />
    }
];
