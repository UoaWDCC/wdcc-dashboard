"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  useIsFetching,
  useIsMutating,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { BoardData, BoardMeta } from "@/lib/tasks/types";
import { boardMetaQuery, boardVersionQuery, taskKeys } from "./query-options";

export function useBoardSync({
  initialVersion,
  initialMeta,
  dragging,
}: {
  initialVersion: string;
  initialMeta: BoardMeta;
  dragging: boolean;
}) {
  const queryClient = useQueryClient();
  const appliedRef = useRef(initialVersion);
  const handledTickRef = useRef(0);

  // The board read carries users and tags too; fan them out so they refresh
  // with every board refetch instead of staying frozen at the initial props.
  const onBoard = useCallback(
    (board: BoardData) => {
      queryClient.setQueryData<BoardMeta>(taskKeys.meta, {
        users: board.users,
        tags: board.tags,
      });
      appliedRef.current = board.version;
    },
    [queryClient]
  );

  // useIsMutating takes no filter, so this counts every mutation app-wide.
  const isMutating = useIsMutating() > 0;
  const isFetchingBoard = useIsFetching({ queryKey: taskKeys.all }) > 0;
  const paused = dragging || isMutating || isFetchingBoard;

  const probe = useQuery(boardVersionQuery(initialVersion, !paused));
  const { data: meta = initialMeta } = useQuery(boardMetaQuery(initialMeta));

  // One board fetch per probe tick at most. Keyed on the tick rather than the
  // value so an un-pause cannot re-invalidate on a signature already fetched
  // for, while a failed board fetch still retries on the next tick.
  useEffect(() => {
    if (paused || !probe.data) return;
    if (probe.data === appliedRef.current) return;
    if (probe.dataUpdatedAt === handledTickRef.current) return;
    handledTickRef.current = probe.dataUpdatedAt;
    queryClient.invalidateQueries({ queryKey: taskKeys.all });
  }, [probe.data, probe.dataUpdatedAt, paused, queryClient]);

  return { onBoard, users: meta.users, tags: meta.tags, probe };
}
