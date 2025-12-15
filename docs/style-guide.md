# ProjectFollow UI Style Guide

## Renk Paleti
- Açık Tema: Nötr tonlar (bg: `#ffffff`, `#f9fafb`, sınır: `#e5e7eb`), vurgu `#2563eb`
- Koyu Tema: Nötr koyu tonlar (bg: `#0b0f14`, `#111827`, sınır: `#1f2937`), vurgu `#60a5fa`

## Tipografi
- Baz: Inter/Segoe UI, 14px–16px; başlıklar 18px–24px
- Satır yüksekliği: 1.5; başlıkların altında minimum 8px boşluk

## Bileşenler
- Button: `default|outline|ghost|destructive` varyantları; `sm|default|lg` boyutları
- Input/Select: yuvarlatılmış 6px, `text-sm`, odak durumunda hafif halka
- Card: yuvarlatılmış 8px, `shadow-sm`, gradient arka plan; hover’da `hover:shadow-md`
- Tabs: üstte yapışkan, aktif sekme koyu zemin beyaz metin
- Badge: durumlara göre anlamlı renkler (Completed: yeşil, InProgress: indigo, Waiting: amber, ToDo: gri)

## Düzen
- Grid yerine çoğunlukla flex; geniş tablolar için yatay scroll
- Beyaz alan: bölümler arasında 16–24px

## Etkileşim ve Animasyon
- Hover: hafif renk değişimi ve gölge
- Active: `active:scale-[0.98]`
- Geçiş: `transition-colors duration-200`

## Tema
- `html.dark` sınıfı; Tailwind `dark:` yardımcıları ile çift tema
- Tema Toggle: sağ üstte, Sun/Moon ikonları

## İkonografi
- `lucide-react`; anlamlı eşleştirmeler: durum=CheckCircle, öncelik=Flag, tarih=Calendar, menü=MoreVertical

## Erişilebilirlik
- Kontrast ≥ 4.5:1; buton etiketleri ve aria-özellikleri (ör. tema toggleda `aria-label`)

