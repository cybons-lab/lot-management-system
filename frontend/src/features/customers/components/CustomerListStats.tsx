import { Users } from "lucide-react";

import * as styles from "../pages/styles";

interface CustomerListStatsProps {
  total: number;
}

export function CustomerListStats({ total }: CustomerListStatsProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statsCard({ variant: "blue" })}>
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <p className={styles.statsLabel}>登録得意先数</p>
            <p className={styles.statsValue({ color: "blue" })}>{total}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
