# Спецификация: Вязальный трекер (Knit Tracker)

Status: ready-for-agent

## Problem Statement

Пользователь начинает свой путь в вязании на спицах и крючком (уже связала шапку и вяжет шарф, в планах — свитера, реглан, носки и сумки). 

Существующие приложения из App Store перегружены навязчивой рекламой, мелкими кнопками и визуальным шумом. В них нелогично выстроена структура (таймер общий на все изделие, а не по частям) и навязаны сложные функции (схемы), которыми начинающий мастер пока не умеет пользоваться.

Во время вязания руки заняты спицами и пряжей, поэтому попадать в мелкие кнопки на экране смартфона крайне неудобно. Вязание часто совмещается с просмотром сериалов или прослушиванием аудио, из-за чего легко отвлечься, забыть, был ли уже посчитан текущий ряд, пропустить важную убавку/прибавку реглана или потерять петли на спицах. Потеря даже одной петли часто приводит к необходимости распускать десятки рядов кропотливой работы. Кроме того, нет простого инструмента для расчета плотности вязания образца до и после влажно-тепловой обработки (ВТО) и наглядного учета времени за любимым хобби по дням и месяцам.

## Solution

Легковесное, полностью автономное веб-приложение (PWA) для iPhone 15 в эстетике Apple Liquid Glass и жидкого хромированного металла (Liquid Silver). Приложение в один клик добавляется на экран «Домой» из Safari, работает без интернета (офлайн), блокирует засыпание экрана во время вязания (Screen Wake Lock) и по умолчанию открывается в темной теме без вибрации.

Приложение реализует естественную трехуровневую структуру («Проект → Части → Счетчик рядов и Таймер»), минималистичный экран вязания с гигантской областью нажатия для свободного добавления ряда без прицеливания, автоматический запуск таймера при клике, журнал рядов с поминутными отметками времени, регулярные напоминания о контрольном пересчете петель каждые 10–15 рядов, правила прибавок для реглана, маркеры на конкретные ряды, инструмент клонирования парных деталей (рукава, носки), калькулятор образца и ВТО, дашборд активности за день и месяц, а также локальное резервное копирование без необходимости регистрации и аккаунтов.

Интерфейс построен по принципу Progressive Disclosure: для простых изделий открыты только базовые поля, а все продвинутые инструменты спрятаны под аккуратную кнопку, чтобы не перегружать начинающую вязальщицу.

## User Stories

1. As a beginner knitter, I want to add the web app to my iPhone 15 home screen, so that I can use it as a full-screen standalone app without browser navigation bars.
2. As a knitter working in different places, I want the app to work 100% offline, so that I can track my knitting on the go, in a park, or in airplane mode without internet access.
3. As an evening knitter watching TV, I want a deep dark theme by default, so that the screen does not blind my eyes in a dim room.
4. As a user with custom phone aesthetics, I want to switch between "Liquid Silver & Titanium" and "Emerald & Violet Glass" themes, so that the app matches my preferred metallic icon style.
5. As a daytime knitter, I want an optional clean light theme, so that I can read the counter clearly in bright sunlight.
6. As a knitter sensitive to vibration, I want haptic feedback disabled by default with an optional toggle in settings, so that my phone remains quiet and still unless I explicitly turn it on.
7. As a knitter with needles in both hands, I want an active knitting screen with a giant tap zone across the center, so that I can increment a row with a thumb or the back of my hand without precise aiming.
8. As a knitter starting a fresh piece from row 0, I want the row counter to begin at 0 and advance to 1 only after the first row is completed, so that the counter reflects finished rows accurately.
9. As a knitter who occasionally misclicks, I want a dedicated -1 button and confirmation for resets, so that I cannot accidentally ruin my row progress.
10. As a knitter who takes tea or conversation breaks, I want the part timer to automatically unpause when I tap +1 row, so that my working time is tracked even if I forgot to manually restart the stopwatch.
11. As a hands-free knitter, I want the screen to stay awake while the knitting timer is active, so that my iPhone does not sleep or require Face ID while I am knitting.
12. As a knitter watching a show, I want to tap on the row number to open a chronological log with exact timestamps, so that I can check if I already recorded the current row or am currently working on it.
13. As a knitter prone to dropping or accidentally adding stitches, I want a periodic stitch check reminder every 10 or 15 rows, so that I catch mistakes immediately before knitting too far ahead.
14. As a knitter responding to a stitch check prompt, I want to confirm my stitch count or update it directly, so that my project records reflect actual stitches on my needles.
15. As a knitter making a hat or sweater, I want to divide a project into distinct parts (e.g. Brim, Body, Crown) with separate row counters and individual timers, so that I know exactly how much time each section took.
16. As a knitter reviewing a project, I want the project to calculate total time automatically as the sum of all its parts, so that I have an accurate overall time investment.
17. As an aspiring sweater knitter, I want to set rhythmic row rules (e.g., increase every 2 rows 16 times), so that the active screen tells me whether the current row requires raglan increases or plain knitting.
18. As a knitter following instructions, I want to attach note markers to specific upcoming rows (e.g., "Row 42: Separate sleeves and body"), so that the app alerts me before I knit past a critical milestone.
19. As a sock and mitten knitter, I want to duplicate a finished part into a paired part (e.g., Sleeve 2, Sock 2), so that both pieces share identical row targets, decrease rules, and checkpoints.
20. As a knitter working with multi-strand yarn or color stripes, I want to record multiple yarn types and track used skeins in the project passport, so that I know if I have enough yarn left for the sleeves.
21. As a knitter washing and blocking pieces, I want a gauge and wet-blocking calculator to enter pre- and post-wash measurements, so that the app calculates shrinkage percentage and true stitches per cm.
22. As a knitter planning a custom size, I want the gauge calculator to compute required cast-on stitches and rows for my desired garment width and height, so that I don't have to do manual math.
23. As a knitter who wants simplicity, I want basic projects (scarf, hat) to show only name and needle size by default, so that I am never overwhelmed by advanced menus I don't need yet.
24. As a knitter progressing in skill, I want advanced options tucked under a gentle "+ Additional parameters" button, so that complex features are available on demand without cluttering simple projects.
25. As a knitter who knits multiple times a day, I want a daily activity stat widget showing rows knitted and time spent today, so that I can see my daily progress across multiple sessions.
26. As a knitter tracking my hobby over time, I want monthly and all-time stats showing total hours and finished projects, so that I can celebrate my productivity and growth.
27. As an organized crafter, I want to group projects into folders (e.g., "Hats", "Sweaters") and tags, so that my project catalog stays neat and searchable.
28. As a proud maker, I want to attach finished photos to completed projects and view them in a finished gallery, so that I have a portfolio of all my handcrafted work.
29. As an offline user without a cloud account, I want a 1-click JSON backup export and restore button, so that my projects and stats are safely preserved in iCloud or Files if I change phones.

## Implementation Decisions

1. **Архитектурный каркас (PWA & Offline-First)**:
   Приложение собирается как Progressive Web App на чистом стеке (HTML5, современный CSS3, Vanilla ES Modules) без тяжелых сторонних фреймворков. Ресурсы кэшируются через `sw.js` (Service Worker), обеспечивая полную автономность без интернета. Поддерживаются iOS-специфичные мета-теги (`apple-mobile-web-app-capable`, `viewport-fit=cover`, `apple-touch-icon`).

2. **Дизайн-система (Apple Liquid Glass & Liquid Silver)**:
   Реализуется система CSS-переменных, переключаемая через атрибут `[data-theme]`:
   - `liquid-silver`: хромированные градиенты, титановые контуры кнопок, темный фон Space Gray (активна по умолчанию).
   - `emerald-glass`: полупрозрачные стеклянные карточки (`backdrop-filter: blur(20px)`), глубокий темный фон, изумрудные и фиолетовые акценты.
   - `light-minimal`: светлая тема с деликатными тенями.

3. **Модуль состояния (KnitStore)**:
   Централизованное хранилище состояния в `localStorage` с автоматическим сохранением всех мутаций. Обеспечивает операции над проектами, деталями, счетчиками рядов, таймерами, журналами и историей активности.

4. **Высокоточный таймер и Screen Wake Lock**:
   Таймер отсчитывает время по разнице системных меток `Date.now()`, что исключает погрешности и остановку при сворачивании браузера. При активном таймере вызывается `navigator.wakeLock.request('screen')`, предотвращая затухание экрана iPhone.

5. **Журнал рядов (Row Log)**:
   Каждое нажатие «+1 ряд» записывает объект `{ rowNumber, timestamp: ISOString }`. Нажатие на цифру текущего ряда открывает всплывающий модальный диалог с историей времени каждого ряда.

6. **Контрольный пересчет петель и правила рядов**:
   Внутри каждой детали задается интервал проверки петель (`stitchCheckInterval`, по умолчанию 10 или 15 рядов) и целевое число петель. При совпадении текущего ряда с интервалом активируется модальный диалог подтверждения петель. Правила рядов отслеживают четность/периодичность для реглана и кос.

7. **Калькулятор образца и ВТО**:
   Чистые математические функции:
   - Плотность петель: `gaugeStitchesPerCm = stitchesPostWash / sampleWidthPostWash`.
   - Плотность рядов: `gaugeRowsPerCm = rowsPostWash / sampleHeightPostWash`.
   - Усадка/растяжение: `shrinkageWidth = ((sampleWidthPostWash - sampleWidthPreWash) / sampleWidthPreWash) * 100%`.
   - Расчет набора: `castOnStitches = Math.round(targetWidthCm * gaugeStitchesPerCm)`.

8. **Прогрессивное раскрытие (Progressive Disclosure)**:
   Интерфейс создания и редактирования проекта по умолчанию отображает минимальный набор полей. Расширенные блоки (учет пряжи, парная деталь, калькулятор ВТО, фото, заметки) инкапсулированы в сворачиваемую секцию.

## Testing Decisions

1. **Тестовый шов (Test Seam)**:
   Единая наивысшая точка входа для автоматизированного тестирования — фасад модуля состояния `KnitStore` и чистые математические функции (`GaugeCalculator`, `CheckpointEngine`). Все сценарии пользователя (создание проекта, прибавление ряда, старт/пауза/авто-возобновление таймера, срабатывание чекпоинта петель, расчет образца ВТО, экспорт и импорт JSON) тестируются через этот внешний интерфейс.

2. **Критерии качественного теста**:
   Тесты проверяют исключительно внешнее наблюдаемое поведение системы (изменение состояния проекта, расчетные значения плотности, корректность структуры бэкапа), а не внутренние детали реализации.

3. **Тестируемые модули**:
   - `KnitStore`: жизненный цикл проектов, переключение частей, учет рядов, авто-старт таймера, агрегация активности за день и месяц.
   - `GaugeCalculator`: формулы плотности, проценты усадки/растяжения, точность рекомендаций по набору петель.
   - `CheckpointEngine`: триггеры контрольного пересчета на заданных рядах, правила реглана и маркеры.
   - `BackupManager`: валидация схемы JSON, корректность импорта и предотвращение повреждения данных.

## Out of Scope

- Просмотр и редактирование графических схем и PDF-файлов с узорами (отложено до будущих версий).
- Нативная сборка в Xcode / Swift и виджеты для экрана блокировки iOS (WidgetKit).
- Серверная синхронизация, базы данных в облаке и учетные записи пользователей.
- Реклама, платные подписки и внешняя аналитика.

## Further Notes

- Интерфейс оптимизирован под пропорции и безопасные зоны экрана iPhone 15 (`safe-area-inset-top`, `safe-area-inset-bottom`).
- Приложение поставляется с демонстрационным проектом в процессе и одним завершенным проектом, чтобы пользователь мог сразу оценить работу всех экранов.
