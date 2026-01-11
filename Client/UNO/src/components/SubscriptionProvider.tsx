import React from "react";
import { useAppDispatch } from "../store/hooks";
import { pending$, active$ } from "../services/api";
import { addOrUpdateGame, removeGame } from "../store/pendingGamesSlice";

const SubscriptionProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    const pSub = pending$.subscribe((g: any) => {
      if (g?.pending) {
        dispatch(addOrUpdateGame(g));
      } else {
        dispatch(removeGame(g.id));
      }
    });

    const aSub = active$.subscribe((g: any) => {
      // When an active match appears, ensure any pending lobby with same id is removed.
      if (g?.id) dispatch(removeGame(g.id));
      // Optionally dispatch updates to ongoing/active slice here if available.
    });

    return () => {
      pSub.unsubscribe();
      aSub.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
};

export default SubscriptionProvider;
