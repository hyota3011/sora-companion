export function toOpenAICompatibleMessages(messages) {
    return messages.map((message) => {
        if (!message.images?.length) {
            return {
                role: message.role,
                content: message.content,
            };
        }

        const content = [];
        if (message.content) {
            content.push({ type: "text", text: message.content });
        }

        message.images.forEach((image) => {
            content.push({
                type: "image_url",
                image_url: {
                    url: image.dataUrl,
                },
            });
        });

        return {
            role: message.role,
            content,
        };
    });
}

export function toClaudeMessages(messages) {
    return messages.map((message) => {
        if (!message.images?.length) {
            return {
                role: message.role,
                content: message.content,
            };
        }

        const content = [];
        if (message.content) {
            content.push({ type: "text", text: message.content });
        }

        message.images.forEach((image) => {
            const { mediaType, data } = parseDataUrl(image);
            content.push({
                type: "image",
                source: {
                    type: "base64",
                    media_type: mediaType,
                    data,
                },
            });
        });

        return {
            role: message.role,
            content,
        };
    });
}

function parseDataUrl(image) {
    const match = image.dataUrl.match(/^data:([^;]+);base64,(.*)$/);

    return {
        mediaType: image.mimeType || match?.[1] || "image/jpeg",
        data: match?.[2] || image.dataUrl,
    };
}
