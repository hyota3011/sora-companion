import { SparkleIcon, MeshIcon, GraduationCapIcon, SearchIcon } from "../components/icons";

export const openai = [
    {
        id: 'search',
        title: 'Search',
        tag: 'GPT-5-nano',
        val: 'gpt-5-nano',
        desc: 'Answers with enhanced references',
        default: true,
        icon: <SearchIcon />
    },
    {
        id: 'smart',
        title: 'Smart',
        tag: 'GPT-5-mini',
        val: 'gpt-5-mini',
        desc: 'Thinks deeply or quickly based on the task - GPT 5 ',
        default: false,
        icon: <SparkleIcon />
    },
    {
        id: 'learn',
        title: 'Study and learn',
        tag: 'GPT-5.2',
        val: 'gpt-5.2',
        desc: 'Quizzes, guided learning, and more',
        default: false,
        icon: <GraduationCapIcon />
    },
    {
        id: 'deeper',
        title: 'Think deeper',
        tag: 'GPT-5.2-pro',
        val: 'gpt-5.2-pro',
        desc: 'Better for more complex topics',
        default: false,
        icon: <MeshIcon />
    }
];
