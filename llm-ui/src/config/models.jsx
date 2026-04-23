import { openai } from './openai';
import { grok } from './grok';
import { provider } from './profiles';

export function getModels() {
    const activeId = localStorage.getItem("activeProfileId");
    switch (activeId) {
        case provider.OPENAI:
            return openai;
        case provider.GROK:
            return grok;
        default:
            return openai;
    }
}

export function getDefaultModel() {
    return getModels().find(model => model.default);
}

export function getValueOfDefaultModel() {
    return getModels().find(model => model.default)?.val;
}

export function getIdOfDefaultModel() {
    return getModels().find(model => model.default)?.id;
}