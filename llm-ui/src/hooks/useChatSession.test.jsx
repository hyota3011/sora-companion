import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatSession } from "./useChatSession.js";

const mockStreamChat = vi.hoisted(() => vi.fn());

vi.mock("../api/index.js", () => ({
    streamChat: mockStreamChat,
}));

/**
 * Creates a stream whose next delta is controlled by the test.
 * @returns {Object} An async iterator with emit and finish controls.
 */
function createControlledStream() {
    let resolveNext;
    return {
        [Symbol.asyncIterator]() {
            return this;
        },
        emit(value) {
            resolveNext({ done: false, value });
        },
        finish() {
            resolveNext({ done: true, value: undefined });
        },
        next() {
            return new Promise((resolve) => {
                resolveNext = resolve;
            });
        },
    };
}

/**
 * Creates the minimal settings shape required by the chat session hook.
 * @returns {Object} Hook options with no global preference.
 */
function createSessionOptions() {
    return {
        isPreferenceIncognitoEnabled: false,
        isPreferenceLoading: false,
        restoreComposerMessage: vi.fn(),
        userPreference: "",
    };
}

beforeEach(() => {
    mockStreamChat.mockReset();
    localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("useChatSession cancellation", () => {
    it("aborts and discards a response when a new chat starts", async () => {
        const stream = createControlledStream();
        mockStreamChat.mockReturnValue(stream);
        const { result } = renderHook(() => useChatSession(createSessionOptions()));

        let request;
        act(() => {
            request = result.current.sendMessage({ images: [], tabs: [], text: "Old prompt" });
        });

        await waitFor(() => expect(mockStreamChat).toHaveBeenCalledOnce());
        const signal = mockStreamChat.mock.calls[0][3].signal;

        act(() => {
            result.current.resetSession();
        });

        expect(signal.aborted).toBe(true);
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.streamingMessage).toBeNull();
        expect(result.current.messages).toEqual([]);

        await act(async () => {
            stream.emit("late answer");
            stream.finish();
            await request;
        });

        expect(result.current.messages).toEqual([]);
        expect(result.current.compactMemory).toBeNull();
    });

    it("does not let a cancelled compaction overwrite a new session", async () => {
        const stream = createControlledStream();
        mockStreamChat.mockReturnValue(stream);
        const { result } = renderHook(() => useChatSession(createSessionOptions()));

        act(() => {
            result.current.restoreSession({
                compactMemory: null,
                createdAt: 1,
                id: "saved-chat",
                messages: [{ id: "user", sender: "user", text: "Retain this only before reset" }],
                title: "Saved chat",
            });
        });

        let request;
        act(() => {
            request = result.current.handleCompact();
        });
        await waitFor(() => expect(mockStreamChat).toHaveBeenCalledOnce());

        act(() => {
            result.current.resetSession();
        });

        await act(async () => {
            stream.emit("late compact memory");
            stream.finish();
            await request;
        });

        expect(result.current.messages).toEqual([]);
        expect(result.current.compactMemory).toBeNull();
        expect(result.current.isFirstMessage).toBe(true);
    });

    it("allows only one request before React has rendered the streaming state", async () => {
        const stream = createControlledStream();
        mockStreamChat.mockReturnValue(stream);
        const { result } = renderHook(() => useChatSession(createSessionOptions()));

        let firstRequest;
        let secondRequest;
        act(() => {
            firstRequest = result.current.sendMessage({ images: [], tabs: [], text: "First" });
            secondRequest = result.current.sendMessage({ images: [], tabs: [], text: "Second" });
        });

        await waitFor(() => expect(mockStreamChat).toHaveBeenCalledOnce());
        expect(secondRequest).toBeNull();

        await act(async () => {
            stream.finish();
            await firstRequest;
        });
    });
});
