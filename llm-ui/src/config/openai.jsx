import { SearchIcon, ZapIcon, GraduationCapIcon, BrainIcon } from "../components/icons";

export const openai = [
    {
        id: 'moon',
        title: 'Moon',
        tag: 'GPT-5.4 Luna',
        val: 'gpt-5.6-luna',
        desc: 'GPT-5.6 model optimized for cost-sensitive workloads',
        default: true,
        icon: <ZapIcon />
    },
    {
        id: 'earth',
        title: 'Earth',
        tag: 'GPT-5.6 Terra',
        val: 'gpt-5.6-terra',
        desc: 'GPT-5.6 model that balances intelligence and cost',
        default: false,
        icon: <GraduationCapIcon />
    },
    {
        id: 'sun',
        title: 'Sun',
        tag: 'GPT-5.6 Sol',
        val: 'gpt-5.6-sol',
        desc: 'Frontier model for complex professional work',
        default: false,
        icon: <BrainIcon />
    }
];
