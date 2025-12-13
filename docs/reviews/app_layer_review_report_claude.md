# 繧｢繝励Μ螻､ 縺ゅｉ謗｢縺励Ξ繝昴・繝・
**菴懈・譌･**: 2025-12-13
**蟇ｾ雎｡**: lot-management-system v2.1 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ螻､
**蜑肴署**: 譌｢豎ｺ譁ｹ驥晢ｼ・K豁｣縲〕ot蜑企勁縺励↑縺・∵｡・謗｡逕ｨ・峨ｒ驕ｵ螳・
---

## 逶ｮ谺｡

1. [P0: 譛ｬ逡ｪ莠区腐繝ｪ繧ｹ繧ｯ](#p0-譛ｬ逡ｪ莠区腐繝ｪ繧ｹ繧ｯ)
2. [P1: 霑代＞蟆・擂莠区腐繝ｪ繧ｹ繧ｯ](#p1-霑代＞蟆・擂莠区腐繝ｪ繧ｹ繧ｯ)
3. [P2: 謚陦鍋噪雋蛯ｵ](#p2-謚陦鍋噪雋蛯ｵ)
4. [P3: 謾ｹ蝟・耳螂ｨ](#p3-謾ｹ蝟・耳螂ｨ)
5. [荳贋ｽ・莉ｶ縺ｮ縺ｾ縺ｨ繧‐(#荳贋ｽ・莉ｶ縺ｮ縺ｾ縺ｨ繧・
6. [謗ｨ螂ｨ螳溯｡碁・(#謗ｨ螂ｨ螳溯｡碁・

---

## P0: 譛ｬ逡ｪ莠区腐繝ｪ繧ｹ繧ｯ

### 1. 繝ｭ繝・ヨ迚ｩ逅・炎髯､縺ｮ螳溯｣・ｼ域里豎ｺ譁ｹ驥晞＆蜿搾ｼ・
**蜆ｪ蜈亥ｺｦ**: P0
**蠖ｱ髻ｿ遽・峇**: `backend/app/application/services/inventory/lot_service.py:542-549`

#### 逞・憾
`LotService.delete_lot()` 縺後Ο繝・ヨ繧堤黄逅・炎髯､縺励※縺・ｋ縲よ里豎ｺ譁ｹ驥昴畦ot 縺ｯ迚ｩ逅・炎髯､縺励↑縺・りｪ､繧翫・繝槭う繝翫せ/繝励Λ繧ｹ隱ｿ謨ｴ縺ｧ蟇ｾ蠢懊阪↓驕募渚縲・
#### 蜀咲樟/譚｡莉ｶ
`DELETE /api/inventory/lots/{lot_id}` API繧貞他縺ｳ蜃ｺ縺励◆蝣ｴ蜷医・
#### 蜴溷屏
```python
# lot_service.py:542-549
def delete_lot(self, lot_id: int) -> None:
    """Delete a lot."""
    db_lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise LotNotFoundError(lot_id)

    self.db.delete(db_lot)  # 竊・迚ｩ逅・炎髯､
    self.db.commit()
```

#### 菫ｮ豁｣譯・
**譛蟆乗｡・*: API繝ｫ繝ｼ繧ｿ繝ｼ縺ｧ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ辟｡蜉ｹ蛹・```python
# lots_router.py
@router.delete("/{lot_id}")
async def delete_lot(lot_id: int, ...):
    raise HTTPException(
        status_code=403,
        detail="繝ｭ繝・ヨ縺ｮ蜑企勁縺ｯ險ｱ蜿ｯ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲ょ惠蠎ｫ隱ｿ謨ｴ繧剃ｽｿ逕ｨ縺励※縺上□縺輔＞縲・
    )
```

**逅・Φ譯・*: `delete_lot` 繝｡繧ｽ繝・ラ繧貞ｻ・ｭ｢縺励∽ｻ｣繧上ｊ縺ｫ `archive_lot` 縺ｾ縺溘・ `deactivate_lot` 繧貞ｮ溯｣・ゅせ繝・・繧ｿ繧ｹ繧・`depleted` 縺ｾ縺溘・ `archived` 縺ｫ螟画峩縺吶ｋ縲・
#### 菫ｮ豁｣譎ゅ・豕ｨ諢・- 譌｢蟄倥・繝・せ繝医〒 `delete_lot` 繧貞他縺ｳ蜃ｺ縺励※縺・ｋ繧ゅ・縺後≠繧後・菫ｮ豁｣縺悟ｿ・ｦ・- API莉墓ｧ伜､画峩縺ｨ縺ｪ繧九◆繧√√ヵ繝ｭ繝ｳ繝医お繝ｳ繝峨・蟇ｾ蠢懃｢ｺ隱・
---

### 2. 繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ莠碁㍾繧ｳ繝溘ャ繝・
**蜆ｪ蜈亥ｺｦ**: P0
**蠖ｱ髻ｿ遽・峇**: `backend/app/application/services/allocations/cancel.py:133-138`

#### 逞・憾
`cancel_allocations_for_order_line` 縺ｧ `db.commit()` 縺・蝗槫他縺ｰ繧後※縺・ｋ縲・蝗樒岼縺ｮ繧ｳ繝溘ャ繝亥燕縺ｫ萓句､悶′逋ｺ逕溘＠縺溷ｴ蜷医・蝗樒岼縺ｮ繧ｳ繝溘ャ繝亥・螳ｹ縺縺代′蜿肴丐縺輔ｌ縲√ョ繝ｼ繧ｿ荳肴紛蜷医′逋ｺ逕溘☆繧九・
#### 蜀咲樟/譚｡莉ｶ
蜿玲ｳｨ譏守ｴｰ縺ｮ蠑募ｽ薙く繝｣繝ｳ繧ｻ繝ｫ荳ｭ縺ｫ縲・蝗樒岼縺ｮ繧ｳ繝溘ャ繝亥燕縺ｫ萓句､悶′逋ｺ逕溘＠縺溷ｴ蜷医・
#### 蜴溷屏
```python
# cancel.py:127-138
if cancelled_ids:
    db.commit()  # 竊・1蝗樒岼縺ｮ繧ｳ繝溘ャ繝・
    line = db.get(OrderLine, order_line_id)
    if line:
        update_order_allocation_status(db, line.order_id)
        update_order_line_status(db, line.id)
        db.commit()  # 竊・2蝗樒岼縺ｮ繧ｳ繝溘ャ繝茨ｼ医％縺薙〒螟ｱ謨励☆繧九→繝・・繧ｿ荳肴紛蜷茨ｼ・```

#### 菫ｮ豁｣譯・
**譛蟆乗｡・*: 蜊倅ｸ繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ縺ｫ邨ｱ蜷・```python
if cancelled_ids:
    line = db.get(OrderLine, order_line_id)
    if line:
        update_order_allocation_status(db, line.order_id)
        update_order_line_status(db, line.id)
    db.commit()  # 1蝗槭□縺代さ繝溘ャ繝・```

**逅・Φ譯・*: `flush()` 繧剃ｽｿ逕ｨ縺励∵怙邨ら噪縺ｪ `commit()` 縺ｯ1蝗槭・縺ｿ

#### 菫ｮ豁｣譎ゅ・豕ｨ諢・- 驛ｨ蛻・さ繝溘ャ繝医↓萓晏ｭ倥＠縺ｦ縺・ｋ繝ｭ繧ｸ繝・け縺後↑縺・°遒ｺ隱・
---

### 3. order_service 縺ｮ繧ｹ繝・・繧ｿ繧ｹ繝輔ぅ繝ｫ繧ｿ莠碁㍾驕ｩ逕ｨ

**蜆ｪ蜈亥ｺｦ**: P0
**蠖ｱ髻ｿ遽・峇**: `backend/app/application/services/orders/order_service.py:62-63`

#### 逞・憾
蜷後§繧ｹ繝・・繧ｿ繧ｹ繝輔ぅ繝ｫ繧ｿ縺・蝗樣←逕ｨ縺輔ｌ縺ｦ縺翫ｊ縲√さ繝斐・繝溘せ縺ｨ謗ｨ貂ｬ縺輔ｌ繧九ら樟譎らせ縺ｧ縺ｯ螳溷ｮｳ縺ｯ縺ｪ縺・′縲∝ｰ・擂縺ｮ菫ｮ豁｣縺ｧ迚・婿縺縺大､画峩縺励◆蝣ｴ蜷医↓繝舌げ縺ｫ縺ｪ繧九・
#### 蜀咲樟/譚｡莉ｶ
`OrderService.get_orders()` 縺ｧ繧ｹ繝・・繧ｿ繧ｹ繝輔ぅ繝ｫ繧ｿ繧剃ｽｿ逕ｨ縺励◆蝣ｴ蜷医・
#### 蜴溷屏
```python
# order_service.py:61-64
if status:
    stmt = stmt.where(Order.status == status)
if status:  # 竊・蜷後§譚｡莉ｶ縺・蝗・    stmt = stmt.where(Order.status == status)
```

#### 菫ｮ豁｣譯・驥崎､・｡後ｒ蜑企勁縲・
#### 菫ｮ豁｣譎ゅ・豕ｨ諢・- 縺ｪ縺・
---

### 4. order_service 縺ｮ flush 莠碁㍾蜻ｼ縺ｳ蜃ｺ縺・
**蜆ｪ蜈亥ｺｦ**: P0・域ｽ懷惠逧・ｼ・**蠖ｱ髻ｿ遽・峇**: `backend/app/application/services/orders/order_service.py:288-289`

#### 逞・憾
`cancel_order` 繝｡繧ｽ繝・ラ縺ｧ `db.flush()` 縺・蝗樣｣邯壹〒蜻ｼ縺ｰ繧後※縺・ｋ縲ゅ％繧後ｂ譏弱ｉ縺九↑繧ｳ繝斐・繝溘せ縲・
#### 蜀咲樟/譚｡莉ｶ
```python
# order_service.py:288-289
self.db.flush()
self.db.flush()  # 竊・蜀鈴聞
```

#### 菫ｮ豁｣譯・驥崎､・｡後ｒ蜑企勁縲・
---

## P1: 霑代＞蟆・擂莠区腐繝ｪ繧ｹ繧ｯ

### 5. 繝励Ξ繝薙Η繝ｼ/遒ｺ螳夐俣縺ｮ蝨ｨ蠎ｫ遶ｶ蜷・
**蜆ｪ蜈亥ｺｦ**: P1
**蠖ｱ髻ｿ遽・峇**:
- `backend/app/application/services/allocations/fefo.py`
- `backend/app/application/services/allocations/commit.py`

#### 逞・憾
FEFO蠑募ｽ薙・繝励Ξ繝薙Η繝ｼ・・preview_fefo_allocation`・峨→遒ｺ螳夲ｼ・commit_fefo_allocation`・峨′蛻･繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ縺ｧ螳溯｡後＆繧後ｋ縲ゅ・繝ｬ繝薙Η繝ｼ蠕後∫｢ｺ螳壼燕縺ｫ蛻･繝ｦ繝ｼ繧ｶ繝ｼ縺悟酔縺倥Ο繝・ヨ縺九ｉ蠑募ｽ・蜃ｺ蠎ｫ縺吶ｋ縺ｨ縲∫｢ｺ螳壽凾縺ｫ蝨ｨ蠎ｫ荳崎ｶｳ繧ｨ繝ｩ繝ｼ縺檎匱逕溘☆繧九・
#### 蜀咲樟/譚｡莉ｶ
1. 繝ｦ繝ｼ繧ｶ繝ｼA縺悟女豕ｨ縺ｫ蟇ｾ縺励※FEFO繝励Ξ繝薙Η繝ｼ繧貞ｮ溯｡・2. 繝ｦ繝ｼ繧ｶ繝ｼB縺悟酔縺倥Ο繝・ヨ縺九ｉ蜃ｺ蠎ｫ繧貞ｮ溯｡・3. 繝ｦ繝ｼ繧ｶ繝ｼA縺後・繝ｬ繝薙Η繝ｼ邨先棡繧堤｢ｺ螳壹＠繧医≧縺ｨ縺吶ｋ縺ｨ螟ｱ謨・
#### 蜴溷屏
- 繝励Ξ繝薙Η繝ｼ譎らせ縺ｧ繝ｭ繝・ヨ繧偵Ο繝・け縺励※縺・↑縺・- 遒ｺ螳壽凾縺ｫ蜀崎ｨ育ｮ励○縺壹√・繝ｬ繝薙Η繝ｼ邨先棡繧偵◎縺ｮ縺ｾ縺ｾ菴ｿ逕ｨ

```python
# commit.py:139-144
def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    # ...
    preview = preview_fefo_allocation(db, order_id)  # 竊・繝励Ξ繝薙Η繝ｼ繧貞・螳溯｡・    # 竊・蝠城｡・ preview縺ｫ縺ｯ繝ｭ繝・け縺後↑縺・◆繧√∫｢ｺ螳壼燕縺ｫ蝨ｨ蠎ｫ縺悟､峨ｏ繧句庄閭ｽ諤ｧ
```

#### 菫ｮ豁｣譯・
**譛蟆乗｡・*: 遒ｺ螳壽凾縺ｮ蝨ｨ蠎ｫ荳崎ｶｳ繧偵Θ繝ｼ繧ｶ繝ｼ縺ｫ蛻・°繧翫ｄ縺吶￥繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ
```python
except AllocationCommitError as e:
    if "Insufficient stock" in str(e):
        raise HTTPException(
            status_code=409,
            detail="蝨ｨ蠎ｫ迥ｶ豕√′螟画峩縺輔ｌ縺ｾ縺励◆縲ゅ・繝ｬ繝薙Η繝ｼ繧貞・螳溯｡後＠縺ｦ縺上□縺輔＞縲・
        )
```

**逅・Φ譯・*: Optimistic Locking 繧貞ｮ溯｣・ゅ・繝ｬ繝薙Η繝ｼ譎ゅ↓繝ｭ繝・ヨ縺ｮ `updated_at` 繧定ｨ倬鹸縺励∫｢ｺ螳壽凾縺ｫ繝舌・繧ｸ繝ｧ繝ｳ繝√ぉ繝・け縲・
#### 菫ｮ豁｣譎ゅ・豕ｨ諢・- UX縺ｸ縺ｮ蠖ｱ髻ｿ繧定・・・医お繝ｩ繝ｼ譎ゅ・蜀崎ｩｦ陦後ヵ繝ｭ繝ｼ・・
---

### 6. 繧､繝吶Φ繝育匱陦後・繧ｿ繧､繝溘Φ繧ｰ蝠城｡・
**蜆ｪ蜈亥ｺｦ**: P1
**蠖ｱ髻ｿ遽・峇**:
- `backend/app/application/services/allocations/confirm.py:160-167`
- `backend/app/application/services/inventory/lot_service.py:673-682`
- `backend/app/application/services/inventory/withdrawal_service.py:221-229`

#### 逞・憾
繝峨Γ繧､繝ｳ繧､繝吶Φ繝茨ｼ・AllocationConfirmedEvent`, `StockChangedEvent`・峨′DB繧ｳ繝溘ャ繝亥ｾ後↓逋ｺ陦後＆繧後ｋ縲ゅう繝吶Φ繝医ワ繝ｳ繝峨Λ繝ｼ縺ｧ縺ｮ蜃ｦ逅・､ｱ謨励′DB縺ｫ繝ｭ繝ｼ繝ｫ繝舌ャ繧ｯ縺輔ｌ縺ｪ縺・・
#### 蜀咲樟/譚｡莉ｶ
繧ｳ繝溘ャ繝域・蜉溷ｾ後√う繝吶Φ繝医ワ繝ｳ繝峨Λ繝ｼ縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医・
#### 蜴溷屏
```python
# confirm.py:154-167
if commit_db:
    db.commit()
    db.refresh(allocation)
    # ...
    event = AllocationConfirmedEvent(...)
    EventDispatcher.queue(event)  # 竊・繧ｳ繝溘ャ繝亥ｾ後↓逋ｺ陦・```

#### 菫ｮ豁｣譯・
**譛蟆乗｡・*: 繧､繝吶Φ繝医ワ繝ｳ繝峨Λ繝ｼ縺ｯ蜀ｪ遲会ｼ・dempotent・峨↓螳溯｣・＠縲∝､ｱ謨励＠縺ｦ繧ょ・隧ｦ陦悟庄閭ｽ縺ｫ

**逅・Φ譯・*: Outbox Pattern 繧貞ｮ溯｣・ゅう繝吶Φ繝医ｒDB縺ｫ菫晏ｭ倥＠縺ｦ縺九ｉ髱槫酔譛溘〒蜃ｦ逅・・
```python
# Transaction蜀・〒繧､繝吶Φ繝医ｒDB縺ｫ險倬鹸
db.add(DomainEventLog(event_type="AllocationConfirmed", payload={...}))
db.commit()
# 蛻･繝励Ο繧ｻ繧ｹ縺ｧ繧､繝吶Φ繝医ｒ蜃ｦ逅・```

#### 菫ｮ豁｣譎ゅ・豕ｨ諢・- 迴ｾ譎らせ縺ｧ繧､繝吶Φ繝医ワ繝ｳ繝峨Λ繝ｼ縺御ｽ輔ｒ縺励※縺・ｋ縺狗｢ｺ隱阪′蠢・ｦ・- 謗ｨ貂ｬ: `EventDispatcher._handlers` 縺檎ｩｺ縺ｮ蜿ｯ閭ｽ諤ｧ縺ゅｊ・亥ｽｱ髻ｿ縺ｯ髯仙ｮ夂噪・・
---

### 7. 髱樊耳螂ｨ datetime.utcnow() 縺ｮ菴ｿ逕ｨ

**蜆ｪ蜈亥ｺｦ**: P1
**蠖ｱ髻ｿ遽・峇**: 隍・焚繝輔ぃ繧､繝ｫ・・ommit.py, confirm.py, cancel.py, manual.py, preempt.py, withdrawal_service.py, lot_service.py・・
#### 逞・憾
Python 3.12+縺ｧ縺ｯ `datetime.utcnow()` 縺碁撼謗ｨ螂ｨ縲ゅち繧､繝繧ｾ繝ｼ繝ｳ諠・ｱ縺後↑縺上∝ｰ・擂逧・↓繧ｨ繝ｩ繝ｼ縺ｫ縺ｪ繧句庄閭ｽ諤ｧ縲・
#### 蜀咲樟/譚｡莉ｶ
Python 3.12莉･髯阪〒Deprecation Warning縺檎匱逕溘１ython 3.14・井ｺ亥ｮ夲ｼ峨〒蜑企勁縺輔ｌ繧句庄閭ｽ諤ｧ縲・
#### 蜴溷屏
```python
# 隍・焚邂・園縺ｧ菴ｿ逕ｨ
reservation.created_at = datetime.utcnow()
lot.updated_at = datetime.utcnow()
```

#### 菫ｮ豁｣譯・```python
from datetime import datetime, timezone

# Before
datetime.utcnow()

# After
datetime.now(timezone.utc)
```

#### 菫ｮ豁｣譎ゅ・豕ｨ諢・- `datetime.now()` 縺ｨ縺ｮ豺ｷ蝨ｨ縺後≠繧狗ｮ・園繧よｳｨ諢擾ｼ・ithdrawal_service.py:200, 214・・
---

### 8. 讌ｽ隕ｳ逧・Ο繝・け譛ｪ螳溯｣・
**蜆ｪ蜈亥ｺｦ**: P1
**蠖ｱ髻ｿ遽・峇**:
- `backend/app/application/services/allocations/preempt.py`
- `backend/app/infrastructure/persistence/models/orders_models.py`

#### 逞・憾
蜷梧凾縺ｫ隍・焚繝ｦ繝ｼ繧ｶ繝ｼ縺悟酔縺倥ョ繝ｼ繧ｿ繧呈峩譁ｰ縺励◆蝣ｴ蜷医√悟ｾ悟享縺｡縲阪→縺ｪ繧翫∝・縺ｫ譖ｴ譁ｰ縺励◆繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ螟画峩縺悟､ｱ繧上ｌ繧九・
#### 蜀咲樟/譚｡莉ｶ
1. 繝ｦ繝ｼ繧ｶ繝ｼA縺悟女豕ｨ譏守ｴｰ繧定｡ｨ遉ｺ
2. 繝ｦ繝ｼ繧ｶ繝ｼB縺悟酔縺俶・邏ｰ繧堤ｷｨ髮・・菫晏ｭ・3. 繝ｦ繝ｼ繧ｶ繝ｼA縺悟商縺・ョ繝ｼ繧ｿ繧貞・縺ｫ邱ｨ髮・・菫晏ｭ・竊・B縺ｮ螟画峩縺悟､ｱ繧上ｌ繧・
#### 蜴溷屏
繝｢繝・Ν縺ｫ `version` 繧ｫ繝ｩ繝繧・`updated_at` 繝√ぉ繝・け縺後↑縺・・
#### 菫ｮ豁｣譯・
**逅・Φ譯・*: SQLAlchemy 縺ｮ `version_id_col` 繧剃ｽｿ逕ｨ
```python
class Order(Base):
    __tablename__ = "orders"

    version = Column(Integer, nullable=False, default=1)
    __mapper_args__ = {"version_id_col": version}
```

#### 菫ｮ豁｣譎ゅ・豕ｨ諢・- 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ縺悟ｿ・ｦ・- API繝ｪ繧ｯ繧ｨ繧ｹ繝医〒 `version` 繧貞女縺大叙繧句ｿ・ｦ・
---

## P2: 謚陦鍋噪雋蛯ｵ

### 9. Raw SQL繧ｯ繧ｨ繝ｪ縺ｮ菴ｿ逕ｨ

**蜆ｪ蜈亥ｺｦ**: P2
**蠖ｱ髻ｿ遽・峇**: `backend/app/application/services/orders/order_service.py:301-314, 343-355`

#### 逞・憾
繝薙Η繝ｼ・・v_order_line_details`・峨ｒ逶ｴ謗･ raw SQL 縺ｧ蜿ｩ縺・※縺・ｋ縲４QL繧､繝ｳ繧ｸ繧ｧ繧ｯ繧ｷ繝ｧ繝ｳ縺ｮ繝ｪ繧ｹ繧ｯ縺ｯ菴弱＞・医ヱ繝ｩ繝｡繝ｼ繧ｿ蛹悶＆繧後※縺・ｋ・峨′縲∽ｿ晏ｮ域ｧ縺梧が縺・・
#### 蜴溷屏
```python
# order_service.py:301-308
query = """
    SELECT
        order_id, line_id,
        supplier_name,
        ...
    FROM v_order_line_details
    WHERE order_id IN :order_ids
"""
rows = self.db.execute(text(query), {"order_ids": tuple(order_ids)}).fetchall()
```

#### 菫ｮ豁｣譯・SQLAlchemy 繝｢繝・Ν・・OrderLineDetails・峨ｒ菴ｿ逕ｨ縺励※ORM邨檎罰縺ｧ繧ｯ繧ｨ繝ｪ縲・
---

### 10. 髱樊耳螂ｨ繝｡繧ｽ繝・ラ縺ｮ谿句ｭ・
**蜆ｪ蜈亥ｺｦ**: P2
**蠖ｱ髻ｿ遽・峇**: `backend/app/infrastructure/persistence/repositories/allocation_repository.py:165-183`

#### 逞・憾
`update_lot_allocated_quantity` 縺・`DEPRECATED` 縺ｨ縺励※繝槭・繧ｯ縺輔ｌ縺ｦ縺・ｋ縺後√さ繝ｼ繝牙・縺ｫ谿九▲縺ｦ縺・ｋ縲・
#### 蜴溷屏
```python
# allocation_repository.py:165-183
def update_lot_allocated_quantity(self, lot_id: int, allocated_delta: float) -> None:
    """...
    DEPRECATED: This method is deprecated. Use LotReservation instead.
    """
    warnings.warn(...)
    pass  # No-op
```

#### 菫ｮ豁｣譯・蜻ｼ縺ｳ蜃ｺ縺怜・繧堤｢ｺ隱阪＠縲∽ｽｿ逕ｨ縺輔ｌ縺ｦ縺・↑縺代ｌ縺ｰ蜑企勁縲・
---

### 11. 繝輔Ο繝ｳ繝医お繝ｳ繝峨・v1/v2 API豺ｷ蝨ｨ

**蜆ｪ蜈亥ｺｦ**: P2
**蠖ｱ髻ｿ遽・峇**: `frontend/src/features/allocations/api.ts`

#### 逞・憾
v1 API・・allocations`・峨→v2 API・・v2/allocation`・峨′豺ｷ蝨ｨ縲ゅΞ繧ｬ繧ｷ繝ｼ繧ｳ繝ｼ繝峨′谿九▲縺ｦ縺・ｋ縲・
#### 蜴溷屏
```typescript
// api.ts:140-148 (v1 Legacy)
export async function createAllocations(payload: CreateAllocationPayload): Promise<AllocationResult> {
  await http.post("allocations", payload);
  return { order_id: payload.order_line_id };
}

// api.ts:338-340 (v2)
export const createManualAllocationSuggestion = (data: ManualAllocationRequest) => {
  return http.post<ManualAllocationResponse>("v2/allocation/manual", data);
};
```

#### 菫ｮ豁｣譯・v1 API繧剃ｽｿ逕ｨ縺励※縺・ｋ邂・園繧堤音螳壹＠縲」2縺ｫ遘ｻ陦悟ｾ後√Ξ繧ｬ繧ｷ繝ｼ繧ｳ繝ｼ繝峨ｒ蜑企勁縲・
---

### 12. Allocation Repository縺ｮ繧ｹ繝・・繧ｿ繧ｹ荳堺ｸ閾ｴ

**蜆ｪ蜈亥ｺｦ**: P2
**蠖ｱ髻ｿ遽・峇**: `backend/app/infrastructure/persistence/repositories/allocation_repository.py:65`

#### 逞・憾
`find_active_by_lot_id` 縺ｧ `status == "reserved"` 繧呈､懃ｴ｢縺励※縺・ｋ縺後∽ｻ悶・邂・園・・ervices・峨〒縺ｯ `status == "allocated"` 繧剃ｽｿ逕ｨ縲・
#### 蜴溷屏
```python
# allocation_repository.py:63-68
def find_active_by_lot_id(self, lot_id: int) -> list[Allocation]:
    stmt = (
        select(Allocation)
        .where(Allocation.lot_id == lot_id, Allocation.status == "reserved")  # 竊・"reserved"
        ...
    )
```

```python
# manual.py:104
allocation = Allocation(
    ...
    status="allocated",  # 竊・"allocated"
)
```

#### 菫ｮ豁｣譯・繧ｹ繝・・繧ｿ繧ｹ蛟､繧脱num縺ｧ邨ｱ荳縺励∽ｸ雋ｫ諤ｧ繧堤｢ｺ菫昴・
---

### 13. N+1繧ｯ繧ｨ繝ｪ縺ｮ繝ｪ繧ｹ繧ｯ

**蜆ｪ蜈亥ｺｦ**: P2
**蠖ｱ髻ｿ遽・峇**: `backend/app/application/services/inventory/lot_service.py:117-120`

#### 逞・憾
`find_available_lots` 縺ｧ蜿門ｾ励＠縺溘Ο繝・ヨ縺ｫ蟇ｾ縺励※縲√Ν繝ｼ繝怜・縺ｧ `get_available_quantity` 繧貞他縺ｳ蜃ｺ縺励※縺・ｋ縲ゅΟ繝・ヨ謨ｰ縺悟､壹＞蝣ｴ蜷医¨+1蝠城｡後′逋ｺ逕溘☆繧句庄閭ｽ諤ｧ縲・
#### 蜴溷屏
```python
# lot_service.py:117-120
available_lots = [
    lot for lot in lots if float(get_available_quantity(self.db, lot)) > min_quantity
]
```

#### 菫ｮ豁｣譯・繝舌Ν繧ｯ縺ｧ莠育ｴ・焚驥上ｒ蜿門ｾ励☆繧九け繧ｨ繝ｪ繧貞ｮ溯｣・・
```python
# 荳諡ｬ縺ｧ lot_reservations 繧帝寔險・reservation_sums = (
    db.query(LotReservation.lot_id, func.sum(LotReservation.reserved_qty))
    .filter(LotReservation.lot_id.in_([l.id for l in lots]))
    .filter(LotReservation.status == 'active')
    .group_by(LotReservation.lot_id)
    .all()
)
```

---

### 14. 繝・せ繝井ｸ崎ｶｳ繧ｨ繝ｪ繧｢

**蜆ｪ蜈亥ｺｦ**: P2
**蠖ｱ髻ｿ遽・峇**: 隍・焚

#### 逞・憾
莉･荳九・繧ｷ繝翫Μ繧ｪ縺ｮ繝・せ繝医′荳崎ｶｳ縺励※縺・ｋ蜿ｯ閭ｽ諤ｧ・・- 蜷梧凾螳溯｡鯉ｼ育ｫｶ蜷茨ｼ峨ユ繧ｹ繝・- 蠅・阜譚｡莉ｶ・・謨ｰ驥上∬ｲ謨ｰ縲∵怙螟ｧ蛟､・・- 繧ｽ繝輔ヨ蠑募ｽ凪・繝上・繝牙ｼ募ｽ薙・驛ｨ蛻・｢ｺ螳・- 繝励Μ繧ｨ繝ｳ繝励す繝ｧ繝ｳ・域ｨｪ蜿悶ｊ・峨・繧ｨ繝・ず繧ｱ繝ｼ繧ｹ

#### 讀懆ｨｼ謇矩・```bash
# 繝・せ繝医き繝舌Ξ繝・ず繧堤｢ｺ隱・docker compose exec backend pytest --cov=app --cov-report=html
```

---

## P3: 謾ｹ蝟・耳螂ｨ

### 15. EventDispatcher縺ｮ繧ｷ繝ｳ繧ｰ繝ｫ繝医Φ蝠城｡・
**蜆ｪ蜈亥ｺｦ**: P3
**蠖ｱ髻ｿ遽・峇**: `backend/app/domain/events/dispatcher.py`

#### 逞・憾
`EventDispatcher` 縺後け繝ｩ繧ｹ螟画焚縺ｧ繝上Φ繝峨Λ繝ｼ縺ｨ繧､繝吶Φ繝医く繝･繝ｼ繧堤ｮ｡逅・ゅユ繧ｹ繝磯俣縺ｧ縺ｮ迥ｶ諷句・譛峨′逋ｺ逕溘☆繧句庄閭ｽ諤ｧ縲・
#### 蜴溷屏
```python
class EventDispatcher:
    _handlers: dict[type[DomainEvent], list[EventHandler]] = defaultdict(list)  # 繧ｯ繝ｩ繧ｹ螟画焚
    _pending_events: list[DomainEvent] = []  # 繧ｯ繝ｩ繧ｹ螟画焚
```

#### 菫ｮ豁｣譯・繝・せ繝域凾縺ｫ `clear_handlers()` 縺ｨ `clear_pending()` 繧堤｢ｺ螳溘↓蜻ｼ縺ｳ蜃ｺ縺吶ヵ繧｣繧ｯ繧ｹ繝√Ε繧定ｿｽ蜉縲・
---

### 16. 繝ｭ繧ｮ繝ｳ繧ｰ荳雋ｫ諤ｧ

**蜆ｪ蜈亥ｺｦ**: P3
**蠖ｱ髻ｿ遽・峇**: 隍・焚繧ｵ繝ｼ繝薙せ

#### 逞・憾
荳驛ｨ縺ｮ繧ｵ繝ｼ繝薙せ縺ｧ萓句､也匱逕滓凾縺ｮ繝ｭ繧ｰ蜃ｺ蜉帙′荳崎ｶｳ縲ゅヨ繝ｩ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ譎ゅ↓諠・ｱ縺瑚ｶｳ繧翫↑縺・庄閭ｽ諤ｧ縲・
#### 菫ｮ豁｣譯・蜷・し繝ｼ繝薙せ繝｡繧ｽ繝・ラ縺ｮ蜈･蜿｣/蜃ｺ蜿｣縺ｧ繝ｭ繧ｰ蜃ｺ蜉帙ｒ霑ｽ蜉縲・
---

### 17. 蝙九ヲ繝ｳ繝医・荳榊ｮ悟・諤ｧ

**蜆ｪ蜈亥ｺｦ**: P3
**蠖ｱ髻ｿ遽・峇**: 隍・焚繝輔ぃ繧､繝ｫ

#### 逞・憾
荳驛ｨ縺ｮ髢｢謨ｰ縺ｧ謌ｻ繧雁､縺ｮ蝙九ヲ繝ｳ繝医′ `Any` 縺ｾ縺溘・譛ｪ謖・ｮ壹・
#### 菫ｮ豁｣譯・mypy/pyright縺ｧ繝√ぉ繝・け縺励∝梛繝偵Φ繝医ｒ霑ｽ蜉縲・
---

### 18. 繝輔Ο繝ｳ繝医お繝ｳ繝峨・繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ

**蜆ｪ蜈亥ｺｦ**: P3
**蠖ｱ髻ｿ遽・峇**: `frontend/src/features/allocations/api.ts`

#### 逞・憾
`saveManualAllocations` 縺ｧ `Promise.all` 繧剃ｽｿ逕ｨ縺励※縺・ｋ縺後・縺､縺ｧ繧ょ､ｱ謨励☆繧九→蜈ｨ菴薙′螟ｱ謨玲桶縺・↓縺ｪ繧九るΚ蛻・・蜉溘・謇ｱ縺・′荳肴・遒ｺ縲・
#### 蜴溷屏
```typescript
// api.ts:377-385
const promises = data.allocations.map((a) =>
  createManualAllocationSuggestion({...})
);
const results = await Promise.all(promises);  // 竊・1縺､縺ｧ繧ょ､ｱ謨励☆繧九→蜈ｨ菴灘､ｱ謨・```

#### 菫ｮ豁｣譯・`Promise.allSettled` 繧剃ｽｿ逕ｨ縺励・Κ蛻・・蜉・螟ｱ謨励ｒ蜃ｦ逅・・
---

## 荳贋ｽ・莉ｶ縺ｮ縺ｾ縺ｨ繧・
| 鬆・ｽ・| 蝠城｡・| 蜆ｪ蜈亥ｺｦ | 讎りｦ・|
|------|------|--------|------|
| 1 | 繝ｭ繝・ヨ迚ｩ逅・炎髯､ | P0 | 譌｢豎ｺ譁ｹ驥晞＆蜿阪よ悽逡ｪ縺ｧ繝ｭ繝・ヨ蜑企勁縺輔ｌ繧九→螻･豁ｴ霑ｽ霍｡荳榊庄 |
| 2 | 繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ莠碁㍾繧ｳ繝溘ャ繝・| P0 | 繝・・繧ｿ荳肴紛蜷医Μ繧ｹ繧ｯ |
| 3 | 繧ｹ繝・・繧ｿ繧ｹ繝輔ぅ繝ｫ繧ｿ莠碁㍾驕ｩ逕ｨ | P0 | 譏弱ｉ縺九↑繝舌げ・育樟譎らせ縺ｧ縺ｯ螳溷ｮｳ縺ｪ縺暦ｼ・|
| 4 | 繝励Ξ繝薙Η繝ｼ/遒ｺ螳夐俣縺ｮ遶ｶ蜷・| P1 | 繝槭Ν繝√Θ繝ｼ繧ｶ繝ｼ迺ｰ蠅・〒蝨ｨ蠎ｫ荳崎ｶｳ繧ｨ繝ｩ繝ｼ逋ｺ逕・|
| 5 | datetime.utcnow() | P1 | Python 3.12+縺ｧ髱樊耳螂ｨ隴ｦ蜻翫∝ｰ・擂逧・↓繧ｨ繝ｩ繝ｼ |

---

## 謗ｨ螂ｨ螳溯｡碁・
### 繝輔ぉ繝ｼ繧ｺ1: 邱頑･蟇ｾ蠢懶ｼ・-2譌･・・
1. **繝ｭ繝・ヨ蜑企勁API縺ｮ辟｡蜉ｹ蛹・*・・0-1・・   - `lots_router.py` 縺ｧ DELETE 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ 403 霑泌唆縺ｫ螟画峩
   - 蟾･謨ｰ: 0.5譌･

2. **繝医Λ繝ｳ繧ｶ繧ｯ繧ｷ繝ｧ繝ｳ莠碁㍾繧ｳ繝溘ャ繝井ｿｮ豁｣**・・0-2・・   - `cancel.py` 縺ｮ繧ｳ繝溘ャ繝育ｵｱ蜷・   - 蟾･謨ｰ: 0.5譌･

3. **繧ｳ繝斐・繝溘せ菫ｮ豁｣**・・0-3, P0-4・・   - `order_service.py` 縺ｮ驥崎､・｡悟炎髯､
   - 蟾･謨ｰ: 0.25譌･

### 繝輔ぉ繝ｼ繧ｺ2: 遏ｭ譛溷ｯｾ蠢懶ｼ・騾ｱ髢難ｼ・
4. **datetime.utcnow() 鄂ｮ謠・*・・1-7・・   - 蜈ｨ繝輔ぃ繧､繝ｫ縺ｧ `datetime.now(timezone.utc)` 縺ｫ鄂ｮ謠・   - 蟾･謨ｰ: 1譌･

5. **繝励Ξ繝薙Η繝ｼ/遒ｺ螳壹お繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ謾ｹ蝟・*・・1-5・・   - 繝ｦ繝ｼ繧ｶ繝ｼ繝輔Ξ繝ｳ繝峨Μ繝ｼ縺ｪ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ霑ｽ蜉
   - 蟾･謨ｰ: 1譌･

6. **繧ｹ繝・・繧ｿ繧ｹ蛟､縺ｮ邨ｱ荳**・・2-12・・   - Enum 螳夂ｾｩ縺ｨ菴ｿ逕ｨ邂・園縺ｮ謨ｴ蜷域ｧ遒ｺ隱・   - 蟾･謨ｰ: 1譌･

### 繝輔ぉ繝ｼ繧ｺ3: 荳ｭ譛溷ｯｾ蠢懶ｼ・-4騾ｱ髢難ｼ・
7. **N+1繧ｯ繧ｨ繝ｪ譛驕ｩ蛹・*・・2-13・・   - 繝舌Ν繧ｯ繧ｯ繧ｨ繝ｪ縺ｮ螳溯｣・   - 蟾･謨ｰ: 2譌･

8. **繝輔Ο繝ｳ繝医お繝ｳ繝益1 API蟒・ｭ｢**・・2-11・・   - v2縺ｸ縺ｮ遘ｻ陦後→繝ｬ繧ｬ繧ｷ繝ｼ繧ｳ繝ｼ繝牙炎髯､
   - 蟾･謨ｰ: 3譌･

9. **讌ｽ隕ｳ逧・Ο繝・け螳溯｣・*・・1-8・・   - 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ + API菫ｮ豁｣
   - 蟾･謨ｰ: 5譌･

---

## 蜿り・ 遒ｺ隱阪＠縺溘ヵ繧｡繧､繝ｫ荳隕ｧ

### 繝舌ャ繧ｯ繧ｨ繝ｳ繝・
- `backend/app/application/services/allocations/` (蜈ｨ繝輔ぃ繧､繝ｫ)
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/application/services/inventory/withdrawal_service.py`
- `backend/app/application/services/orders/order_service.py`
- `backend/app/domain/events/dispatcher.py`
- `backend/app/domain/allocation/exceptions.py`
- `backend/app/presentation/api/v2/allocation/router.py`
- `backend/app/infrastructure/persistence/repositories/allocation_repository.py`
- `backend/app/core/errors.py`
- `backend/sql/views/create_views.sql`

### 繝輔Ο繝ｳ繝医お繝ｳ繝・
- `frontend/src/features/allocations/api.ts`
- `frontend/src/shared/api/http-client.ts`

### 繝・せ繝・
- `backend/tests/` (繝・ぅ繝ｬ繧ｯ繝医Μ讒矩遒ｺ隱・
