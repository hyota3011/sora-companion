import { MeshIcon, SearchIcon, GraduationCapIcon, PictureIcon, ImageIcon } from "../components/icons";

export const grok = [
    {
        id: 'grok-4-1-fast-non-reasoning',
        title: 'Fast',
        tag: 'Grok-4.1-Fast',
        val: 'grok-4-1-fast-non-reasoning',
        desc: 'Fast and efficient Grok model',
        default: true,
        icon: <SearchIcon />
    },
    {
        id: 'grok-4.20-0309-reasoning',
        title: 'Reasoning',
        tag: 'Grok-4.20-Reasoning',
        val: 'grok-4.20-0309-reasoning',
        desc: 'Advanced reasoning capabilities',
        default: false,
        icon: <MeshIcon />
    },
    {
        id: 'grok-4.20-0309-non-reasoning',
        title: 'Grok 4.20',
        tag: 'Grok-4.20',
        val: 'grok-4.20-0309-non-reasoning',
        desc: 'Standard Grok 4.20 model',
        default: false,
        icon: <GraduationCapIcon />
    },
    {
        id: 'grok-imagine-image',
        title: 'Imagine',
        tag: 'Grok-Image',
        val: 'grok-imagine-image',
        desc: 'Generate images with Grok',
        default: false,
        icon: <ImageIcon />
    },
    {
        id: 'grok-imagine-image-pro',
        title: 'Imagine Pro',
        tag: 'Grok-Image-Pro',
        val: 'grok-imagine-image-pro',
        desc: 'Advanced image generation',
        default: false,
        icon: <PictureIcon />
    }
];
