"""Notification test data generator."""

import random
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.notification_model import Notification


def generate_notifications(db: Session) -> None:
    """Generate Notification test data.

    Creates user notifications for testing notification system UX.
    """
    users = db.query(User).all()

    if not users:
        return

    # Generate 20-50 notifications across users
    num_notifications = random.randint(20, 50)

    notification_templates = [
        {
            "type": "INFO",
            "title": "新しい発注が追加されました",
            "message": "発注番号 {order_id} が登録されました。",
            "link": "/orders/{order_id}",
        },
        {
            "type": "SUCCESS",
            "title": "出荷が完了しました",
            "message": "発注番号 {order_id} の出荷が完了しました。",
            "link": "/orders/{order_id}",
        },
        {
            "type": "WARNING",
            "title": "在庫が不足しています",
            "message": "製品 {product_code} の在庫が安全在庫を下回っています。",
            "link": "/inventory",
        },
        {
            "type": "ERROR",
            "title": "データ取り込みエラー",
            "message": "CSVファイル {filename} の取り込みに失敗しました。",
            "link": "/imports",
        },
        {
            "type": "INFO",
            "title": "予測データが更新されました",
            "message": "{month} の需要予測が更新されました。",
            "link": "/forecasts",
        },
    ]

    for _ in range(num_notifications):
        user = random.choice(users)
        template = random.choice(notification_templates)

        # 70% unread, 30% read
        is_read = random.random() < 0.3

        # Display strategy distribution
        display_strategy = random.choices(
            ["immediate", "deferred", "persistent"],
            weights=[50, 30, 20],
            k=1,
        )[0]

        # Created within last 30 days
        created_at = datetime.now(UTC) - timedelta(days=random.randint(0, 30))

        # Populate template placeholders
        message = template["message"].format(
            order_id=f"ORD-{random.randint(1000, 9999)}",
            product_code=f"PRD-{random.randint(100, 999)}",
            filename=f"import_{random.randint(1, 100)}.csv",
            month=f"2026-{random.randint(1, 12):02d}",
        )

        link = template["link"].format(order_id=f"ORD-{random.randint(1000, 9999)}")

        notification = Notification(
            user_id=user.id,
            type=template["type"],
            title=template["title"],
            message=message,
            link=link if random.random() < 0.7 else None,  # 70% have links
            is_read=is_read,
            display_strategy=display_strategy,
            created_at=created_at,
        )
        db.add(notification)

    # Edge case: User with 50+ notifications (performance test)
    if users:
        power_user = users[0]
        for i in range(55):
            template = random.choice(notification_templates)
            notification = Notification(
                user_id=power_user.id,
                type=template["type"],
                title=f"[Bulk Test {i + 1}] {template['title']}",
                message=template["message"].format(
                    order_id=f"ORD-{i}",
                    product_code=f"PRD-{i}",
                    filename=f"file_{i}.csv",
                    month=f"2026-{(i % 12) + 1:02d}",
                ),
                is_read=random.random() < 0.5,
                display_strategy="immediate",
                created_at=datetime.now(UTC) - timedelta(hours=i),
            )
            db.add(notification)

    # Edge case: Very long message (UI overflow test)
    if users:
        long_message = (
            "非常に長いメッセージのテストです。" * 20
            + " これはUIのオーバーフロー処理をテストするためのものです。"
        )
        notification = Notification(
            user_id=users[0].id,
            type="INFO",
            title="長文メッセージテスト",
            message=long_message,
            is_read=False,
            display_strategy="persistent",
            created_at=datetime.now(UTC),
        )
        db.add(notification)

    # System notification (broadcast to first user)
    notification = Notification(
        user_id=users[0].id,
        type="INFO",
        title="システムメンテナンス通知",
        message="2026-02-10 02:00-04:00 にシステムメンテナンスを実施します。",
        is_read=False,
        display_strategy="persistent",
        created_at=datetime.now(UTC),
    )
    db.add(notification)

    db.commit()
