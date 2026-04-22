import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("@/shared/api/httpClient", () => ({
  httpClient: {
    request: requestMock,
  },
}));

import { useApiMutation } from "@/shared/hooks/useApiMutation";

describe("useApiMutation", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({ data: { ok: true } });
  });

  it("keeps the mutate callback stable across rerenders", async () => {
    const { result, rerender } = renderHook(() => useApiMutation());
    const firstMutate = result.current.mutate;

    await act(async () => {
      await result.current.mutate({
        method: "post",
        url: "/chat/conversations/7/read",
        data: { until_message_id: 42 },
      });
    });

    expect(requestMock).toHaveBeenCalledWith({
      method: "post",
      url: "/chat/conversations/7/read",
      data: { until_message_id: 42 },
      params: undefined,
    });
    expect(result.current.mutate).toBe(firstMutate);

    rerender();

    expect(result.current.mutate).toBe(firstMutate);
  });
});
