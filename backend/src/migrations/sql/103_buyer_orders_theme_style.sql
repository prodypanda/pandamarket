-- 103_buyer_orders_theme_style.sql
--
-- Platform setting for buyer "My Orders" layout style:
-- 'modern_cards' (Panda Emerald modern card design) or
-- 'timeline_logistics' (AliExpress / Amazon dense logistics timeline)
--

INSERT INTO pd_platform_config (key, value)
VALUES ('buyer_orders_theme_style', 'modern_cards')
ON CONFLICT (key) DO NOTHING;
