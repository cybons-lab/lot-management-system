import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "../../../../../components/ui";
import * as styles from "../LineBasedAllocationList.styles";

export function JumpButtons({
  onScrollToTop,
  onScrollToChecked,
}: {
  onScrollToTop: () => void;
  onScrollToChecked: () => void;
}) {
  return (
    <div className={styles.jumpButtonContainer}>
      {/* TOP ボタン */}
      <Button
        onClick={onScrollToTop}
        className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-blue-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-blue-700"
        title="トップへ"
      >
        <ArrowUp className="h-6 w-6 stroke-[3] text-white" />
        <span className="text-[10px] font-bold text-white">TOP</span>
      </Button>

      {/* CHK ボタン */}
      <Button
        onClick={onScrollToChecked}
        className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-green-600 p-0 shadow-2xl transition-all hover:scale-110 hover:bg-green-700"
        title="チェック済みセクションへ"
      >
        <ArrowDown className="h-6 w-6 stroke-[3] text-white" />
        <span className="text-[10px] font-bold text-white">CHK</span>
      </Button>
    </div>
  );
}
