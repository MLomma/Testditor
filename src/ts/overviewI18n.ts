const OVERVIEW_LANGUAGE_STORAGE_KEY = 'overview-language'

const baseLanguages = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bg', label: 'Bulgarian' },
  { code: 'fa', label: 'Persian' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'sw', label: 'Swahili' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'zh-TW', label: 'Chinese (Traditional)' },
]

const nativeOverviewLanguages = new Set(['en', 'de', 'es', 'fr', 'it', 'nl', 'pt', 'ru', 'uk'])

export const OVERVIEW_TRANSLATION_COOKIE = 'googtrans'
export const OVERVIEW_TRANSLATION_RELOAD_KEY = 'overview-translation-reload'

export const OVERVIEW_TRANSLATION_LANGUAGES = baseLanguages
  .map((language) => ({
    ...language,
    native: nativeOverviewLanguages.has(language.code),
  }))
  .sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
  )

const overviewUi = {
  en: {
    newFunctionsTitle: 'New Functions',
    newFunctionsButton: 'New Functions',
    newFunctionsIntro:
      'These additions are currently proof of principles and nothing more. They are meant to demonstrate the workflows directly inside the LiveEditor.',
    newFunctionsItems: [
      {
        title: 'Start dialog',
        description:
          'A new course overlay now asks for your name, language, and merge links before the editor opens.',
      },
      {
        title: 'Starter card',
        description:
          'The overview now includes a large start card where you can create a course directly and jump straight into the editor.',
      },
      {
        title: 'Localization',
        description:
          'The overview can now switch some supported languages locally without relying on Google Translate.',
      },
      {
        title: 'Dark mode',
        description:
          'The overview and editor now support direct light and dark mode switching.',
      },
      {
        title: 'Drag and drop into the editor',
        description:
          'Media such as images, audio, and video can be dropped directly into the editor.',
      },
      {
        title: 'More user-friendly editor controls',
        description:
          'Plus and minus buttons in the editor improve handling and make common actions easier to access.',
      },
      {
        title: 'Dragging in the live preview',
        description:
          'At least images can now be reordered directly inside the preview area.',
      },
      {
        title: 'Merging multiple links before start',
        description:
          'Several Markdown links can be entered before opening a new course and merged into one document.',
      },
      {
        title: 'Merging by drag and drop into the editor',
        description:
          'Dropping a Markdown link into the editor now merges it with the current document instead of only inserting content.',
      },
      {
        title: 'Direct editing in the live preview',
        description:
          'Plain text and formatted inline text can now be edited directly inside the preview, including more precise caret placement at the clicked position.',
      },
      {
        title: 'Preview selection and toolbar sync',
        description:
          'Selections and cursor positions from the preview are synchronized back to the editor so toolbar actions such as bold, italic, or quiz insertion apply at the exact preview position.',
      },
      {
        title: 'Instant preview updates while editing',
        description:
          'Changes triggered from the preview now compile back immediately so the rendered result stays in sync without a manual refresh step.',
      },
      {
        title: 'Quiz settings via right click',
        description:
          'Quiz blocks in the preview now open a context menu on right click for Partial Solution, Tries, Quiz Content, and an optional Mathematics mode that inserts Algebrite checks and the required header import.',
      },
    ],
    switchThemeTitle: 'Switch between light and dark mode',
    translateOverviewTitle: 'Translate overview',
    newCourse: 'New Course',
    createNewCourseTitle: 'Create New Course',
    newCourseCardDescription:
      'Create a new course directly from the overview with author, language, and optional merge links.',
    authorName: 'Author name',
    yourName: 'Your name',
    language: 'Language',
    importLinkLabel: 'Import course content from this link',
    optionalMarkdownLink: 'Optional link to a Markdown file',
    addMergeLink: 'Add another merge link',
    linkLabel: 'Link',
    secondLinkLabel: 'Second Link',
    optionalMergeLinkPrefix: 'Optional merge link',
    create: 'Create',
    createNewCourseButton: 'Create new course',
    searchPlaceholder: 'Type to search...',
    clearSearch: 'Clear search',
    footerBeforeExamples: 'This is a collaborative online editor for ',
    footerBetweenExamplesAndTemplates:
      '. All content is stored only within your browser. If you need some inspiration, check out some of our ',
    footerBetweenTemplatesAndCourses: ', search for embeddable ',
    footerAfterCourses: ', or already published ',
    footerEnd: '.',
    examples: 'examples',
    templates: 'templates',
    courses: 'courses',
    followUsOn: 'Follow us on:',
    idLabel: 'ID',
    edit: 'Edit',
    exports: 'Exports',
    untitled: 'Untitled',
    deleteAria: 'Delete',
    deleteTitlePrefix: 'Delete',
    deleteConfirmLine1: 'Are you sure that you want to delete this document forever?',
    deleteConfirmLine2: 'It cannot be restored!',
    abort: 'Abort',
    delete: 'Delete',
    close: 'Close',
  },
  de: {
    newFunctionsTitle: 'Neue Funktionen',
    newFunctionsButton: 'Neue Funktionen',
    newFunctionsIntro:
      'Diese Erweiterungen sind derzeit vor allem Machbarkeitsnachweise. Sie sollen die neuen Workflows direkt im LiveEditor zeigen.',
    newFunctionsItems: [
      {
        title: 'Startdialog',
        description:
          'Ein neues Kurs-Overlay fragt jetzt Name, Sprache und Merge-Links ab, bevor der Editor geöffnet wird.',
      },
      {
        title: 'Starter-Kachel',
        description:
          'Die Übersicht enthält jetzt eine große Start-Kachel, über die direkt ein Kurs erstellt und der Editor geöffnet werden kann.',
      },
      {
        title: 'Lokalisierung',
        description:
          'Die Übersicht kann einige unterstützte Sprachen jetzt lokal umschalten, ohne Google Translate zu benötigen.',
      },
      {
        title: 'Dark Mode',
        description:
          'Übersicht und Editor unterstützen jetzt direktes Umschalten zwischen Hell- und Dunkelmodus.',
      },
      {
        title: 'Drag and Drop in den Editor',
        description:
          'Medien wie Bilder, Audio und Video können direkt in den Editor gezogen werden.',
      },
      {
        title: 'Benutzerfreundlichere Editor-Steuerung',
        description:
          'Plus- und Minus-Schaltflächen im Editor erleichtern häufige Aktionen.',
      },
      {
        title: 'Ziehen in der Live-Vorschau',
        description:
          'Zumindest Bilder können jetzt direkt in der Vorschau neu angeordnet werden.',
      },
      {
        title: 'Mehrere Links vor dem Start zusammenführen',
        description:
          'Vor dem Start eines neuen Kurses können mehrere Markdown-Links eingegeben und zu einem Dokument zusammengeführt werden.',
      },
      {
        title: 'Zusammenführen per Drag and Drop in den Editor',
        description:
          'Ein Markdown-Link wird beim Hineinziehen jetzt mit dem aktuellen Dokument zusammengeführt, statt nur eingefügt zu werden.',
      },
      {
        title: 'Direktes Bearbeiten in der Live-Vorschau',
        description:
          'Einfacher Text und formatierter Inline-Text lassen sich jetzt direkt in der Vorschau bearbeiten, einschließlich genauer Cursor-Platzierung an der angeklickten Stelle.',
      },
      {
        title: 'Synchronisierung von Vorschau-Auswahl und Toolbar',
        description:
          'Auswahl und Cursorposition aus der Vorschau werden zurück in den Editor gespiegelt, sodass Toolbar-Aktionen wie Fett, Kursiv oder Quiz-Einfügen genau an der gewählten Preview-Stelle landen.',
      },
      {
        title: 'Sofortige Vorschau-Updates beim Bearbeiten',
        description:
          'Änderungen aus der Vorschau werden jetzt unmittelbar neu kompiliert, sodass das gerenderte Ergebnis ohne manuellen Zwischenschritt aktuell bleibt.',
      },
      {
        title: 'Quiz-Einstellungen per Rechtsklick',
        description:
          'Quiz-Blöcke in der Vorschau öffnen jetzt per Rechtsklick ein Kontextmenü für Partial Solution, Tries, Quiz Content und einen optionalen Mathematik-Modus, der Algebrite-Prüfungen samt benötigtem Header-Import ergänzt.',
      },
    ],
    switchThemeTitle: 'Zwischen Hell- und Dunkelmodus wechseln',
    translateOverviewTitle: 'Übersicht übersetzen',
    newCourse: 'Neuer Kurs',
    createNewCourseTitle: 'Neuen Kurs erstellen',
    newCourseCardDescription:
      'Erstelle direkt aus der Übersicht einen neuen Kurs mit Autor, Sprache und optionalen Merge-Links.',
    authorName: 'Autor',
    yourName: 'Dein Name',
    language: 'Sprache',
    importLinkLabel: 'Kursinhalt aus diesem Link importieren',
    optionalMarkdownLink: 'Optionaler Link zu einer Markdown-Datei',
    addMergeLink: 'Weiteren Merge-Link hinzufügen',
    linkLabel: 'Link',
    secondLinkLabel: 'Zweiter Link',
    optionalMergeLinkPrefix: 'Optionaler Merge-Link',
    create: 'Erstellen',
    createNewCourseButton: 'Neuen Kurs erstellen',
    searchPlaceholder: 'Zum Suchen tippen...',
    clearSearch: 'Suche leeren',
    footerBeforeExamples: 'Dies ist ein kollaborativer Online-Editor für ',
    footerBetweenExamplesAndTemplates:
      '. Alle Inhalte werden nur in deinem Browser gespeichert. Wenn du Inspiration brauchst, schau dir einige unserer ',
    footerBetweenTemplatesAndCourses: ' an, suche nach einbettbaren ',
    footerAfterCourses: ' oder bereits veröffentlichten ',
    footerEnd: '.',
    examples: 'Beispiele',
    templates: 'Vorlagen',
    courses: 'Kurse',
    followUsOn: 'Folge uns auf:',
    idLabel: 'ID',
    edit: 'Bearbeiten',
    exports: 'Exporte',
    untitled: 'Ohne Titel',
    deleteAria: 'Löschen',
    deleteTitlePrefix: 'Löschen',
    deleteConfirmLine1: 'Möchtest du dieses Dokument wirklich dauerhaft löschen?',
    deleteConfirmLine2: 'Es kann nicht wiederhergestellt werden!',
    abort: 'Abbrechen',
    delete: 'Löschen',
    close: 'Schließen',
  },
  es: {
    newFunctionsTitle: 'Nuevas funciones',
    newFunctionsButton: 'Nuevas funciones',
    newFunctionsIntro:
      'Estas ampliaciones son por ahora principalmente pruebas de concepto. Su objetivo es mostrar los flujos directamente dentro del LiveEditor.',
    newFunctionsItems: [
      { title: 'Dialogo inicial', description: 'Ahora una ventana para nuevo curso solicita nombre, idioma y enlaces de fusion antes de abrir el editor.' },
      { title: 'Tarjeta inicial', description: 'La vista general incluye ahora una gran tarjeta inicial para crear un curso directamente y abrir el editor al instante.' },
      { title: 'Localizacion', description: 'La vista general puede cambiar algunas lenguas compatibles localmente sin depender de Google Translate.' },
      { title: 'Modo oscuro', description: 'La vista general y el editor ahora admiten el cambio directo entre modo claro y oscuro.' },
      { title: 'Arrastrar y soltar en el editor', description: 'Medios como imagenes, audio y video pueden soltarse directamente en el editor.' },
      { title: 'Controles del editor mas comodos', description: 'Los botones de mas y menos facilitan el acceso a acciones frecuentes en el editor.' },
      { title: 'Arrastrar en la vista previa', description: 'Al menos las imagenes ya pueden reordenarse directamente dentro del area de vista previa.' },
      { title: 'Fusionar varios enlaces antes de empezar', description: 'Se pueden introducir varios enlaces Markdown antes de abrir un curso nuevo y fusionarlos en un solo documento.' },
      { title: 'Fusion por arrastrar y soltar en el editor', description: 'Al soltar un enlace Markdown en el editor ahora se fusiona con el documento actual en lugar de insertarse solo.' },
    ],
    switchThemeTitle: 'Cambiar entre modo claro y oscuro',
    translateOverviewTitle: 'Traducir vista general',
    newCourse: 'Nuevo curso',
    createNewCourseTitle: 'Crear nuevo curso',
    newCourseCardDescription: 'Crea un curso nuevo directamente desde la vista general con autor, idioma y enlaces opcionales de fusion.',
    authorName: 'Autor',
    yourName: 'Tu nombre',
    language: 'Idioma',
    importLinkLabel: 'Importar contenido del curso desde este enlace',
    optionalMarkdownLink: 'Enlace opcional a un archivo Markdown',
    addMergeLink: 'Anadir otro enlace de fusion',
    linkLabel: 'Enlace',
    secondLinkLabel: 'Segundo enlace',
    optionalMergeLinkPrefix: 'Enlace de fusion opcional',
    create: 'Crear',
    createNewCourseButton: 'Crear nuevo curso',
    searchPlaceholder: 'Escribe para buscar...',
    clearSearch: 'Borrar busqueda',
    footerBeforeExamples: 'Este es un editor colaborativo en linea para ',
    footerBetweenExamplesAndTemplates: '. Todo el contenido se guarda solo en tu navegador. Si necesitas inspiracion, mira algunos de nuestros ',
    footerBetweenTemplatesAndCourses: ', busca ',
    footerAfterCourses: ' integrables o ',
    footerEnd: ' ya publicados.',
    examples: 'ejemplos',
    templates: 'plantillas',
    courses: 'cursos',
    followUsOn: 'Siguenos en:',
    idLabel: 'ID',
    edit: 'Editar',
    exports: 'Exportaciones',
    untitled: 'Sin titulo',
    deleteAria: 'Eliminar',
    deleteTitlePrefix: 'Eliminar',
    deleteConfirmLine1: 'Estas seguro de que quieres eliminar este documento para siempre?',
    deleteConfirmLine2: 'No se puede restaurar.',
    abort: 'Cancelar',
    delete: 'Eliminar',
    close: 'Cerrar',
  },
  fr: {
    newFunctionsTitle: 'Nouvelles fonctions',
    newFunctionsButton: 'Nouvelles fonctions',
    newFunctionsIntro:
      'Ces ajouts sont pour l instant surtout des preuves de concept. Ils doivent montrer directement les nouveaux flux dans le LiveEditor.',
    newFunctionsItems: [
      { title: 'Dialogue de depart', description: 'Une nouvelle fenetre de creation demande maintenant votre nom, la langue et les liens de fusion avant d ouvrir l editeur.' },
      { title: 'Carte de demarrage', description: 'La vue d ensemble contient maintenant une grande carte de demarrage pour creer un cours directement et ouvrir aussitot l editeur.' },
      { title: 'Localisation', description: 'La vue d ensemble peut maintenant changer localement certaines langues prises en charge sans dependre de Google Translate.' },
      { title: 'Mode sombre', description: 'La vue d ensemble et l editeur prennent maintenant en charge le passage direct entre mode clair et sombre.' },
      { title: 'Glisser-deposer dans l editeur', description: 'Des medias comme les images, l audio et la video peuvent etre deposes directement dans l editeur.' },
      { title: 'Commandes d editeur plus pratiques', description: 'Les boutons plus et moins facilitent l acces aux actions frequentes dans l editeur.' },
      { title: 'Glisser dans l apercu en direct', description: 'Au moins les images peuvent maintenant etre reordonnees directement dans l apercu.' },
      { title: 'Fusionner plusieurs liens avant le demarrage', description: 'Plusieurs liens Markdown peuvent etre saisis avant l ouverture d un nouveau cours puis fusionnes en un seul document.' },
      { title: 'Fusion par glisser-deposer dans l editeur', description: 'Un lien Markdown depose dans l editeur est maintenant fusionne avec le document actuel au lieu d etre seulement insere.' },
    ],
    switchThemeTitle: 'Basculer entre mode clair et sombre',
    translateOverviewTitle: 'Traduire la vue d ensemble',
    newCourse: 'Nouveau cours',
    createNewCourseTitle: 'Creer un nouveau cours',
    newCourseCardDescription: 'Creez un nouveau cours directement depuis la vue d ensemble avec auteur, langue et liens de fusion facultatifs.',
    authorName: 'Auteur',
    yourName: 'Votre nom',
    language: 'Langue',
    importLinkLabel: 'Importer le contenu du cours a partir de ce lien',
    optionalMarkdownLink: 'Lien facultatif vers un fichier Markdown',
    addMergeLink: 'Ajouter un autre lien de fusion',
    linkLabel: 'Lien',
    secondLinkLabel: 'Deuxieme lien',
    optionalMergeLinkPrefix: 'Lien de fusion facultatif',
    create: 'Creer',
    createNewCourseButton: 'Creer un nouveau cours',
    searchPlaceholder: 'Tapez pour rechercher...',
    clearSearch: 'Effacer la recherche',
    footerBeforeExamples: 'Ceci est un editeur collaboratif en ligne pour ',
    footerBetweenExamplesAndTemplates: '. Tout le contenu est stocke uniquement dans votre navigateur. Si vous avez besoin d inspiration, consultez quelques-uns de nos ',
    footerBetweenTemplatesAndCourses: ', recherchez des ',
    footerAfterCourses: ' integrables ou des ',
    footerEnd: ' deja publies.',
    examples: 'exemples',
    templates: 'modeles',
    courses: 'cours',
    followUsOn: 'Suivez-nous sur :',
    idLabel: 'ID',
    edit: 'Modifier',
    exports: 'Exportations',
    untitled: 'Sans titre',
    deleteAria: 'Supprimer',
    deleteTitlePrefix: 'Supprimer',
    deleteConfirmLine1: 'Voulez-vous vraiment supprimer ce document definitivement ?',
    deleteConfirmLine2: 'Il ne pourra pas etre restaure !',
    abort: 'Annuler',
    delete: 'Supprimer',
    close: 'Fermer',
  },
  it: {
    newFunctionsTitle: 'Nuove funzioni',
    newFunctionsButton: 'Nuove funzioni',
    newFunctionsIntro:
      'Queste aggiunte sono attualmente soprattutto prove di concetto. Servono a mostrare i flussi direttamente nel LiveEditor.',
    newFunctionsItems: [
      { title: 'Finestra iniziale', description: 'Una nuova finestra per il corso ora richiede nome, lingua e link di merge prima di aprire l editor.' },
      { title: 'Scheda iniziale', description: 'La panoramica ora include una grande scheda iniziale con cui creare subito un corso e passare direttamente all editor.' },
      { title: 'Localizzazione', description: 'La panoramica puo ora cambiare localmente alcune lingue supportate senza dipendere da Google Translate.' },
      { title: 'Modalita scura', description: 'Panoramica ed editor supportano ora il passaggio diretto tra modalita chiara e scura.' },
      { title: 'Drag and drop nell editor', description: 'File multimediali come immagini, audio e video possono essere trascinati direttamente nell editor.' },
      { title: 'Controlli dell editor piu comodi', description: 'I pulsanti piu e meno nell editor rendono piu semplici le azioni frequenti.' },
      { title: 'Trascinamento nell anteprima live', description: 'Almeno le immagini possono ora essere riordinate direttamente nell area di anteprima.' },
      { title: 'Unire piu link prima dell avvio', description: 'Prima di aprire un nuovo corso e possibile inserire piu link Markdown e fonderli in un solo documento.' },
      { title: 'Unione tramite drag and drop nell editor', description: 'Trascinando un link Markdown nell editor, questo viene ora unito al documento corrente invece di essere solo inserito.' },
    ],
    switchThemeTitle: 'Passa tra modalita chiara e scura',
    translateOverviewTitle: 'Traduci panoramica',
    newCourse: 'Nuovo corso',
    createNewCourseTitle: 'Crea un nuovo corso',
    newCourseCardDescription: 'Crea un nuovo corso direttamente dalla panoramica con autore, lingua e link di merge opzionali.',
    authorName: 'Autore',
    yourName: 'Il tuo nome',
    language: 'Lingua',
    importLinkLabel: 'Importa contenuto del corso da questo link',
    optionalMarkdownLink: 'Link opzionale a un file Markdown',
    addMergeLink: 'Aggiungi un altro link di merge',
    linkLabel: 'Link',
    secondLinkLabel: 'Secondo link',
    optionalMergeLinkPrefix: 'Link di merge opzionale',
    create: 'Crea',
    createNewCourseButton: 'Crea un nuovo corso',
    searchPlaceholder: 'Scrivi per cercare...',
    clearSearch: 'Cancella ricerca',
    footerBeforeExamples: 'Questo e un editor collaborativo online per ',
    footerBetweenExamplesAndTemplates: '. Tutti i contenuti vengono salvati solo nel tuo browser. Se cerchi ispirazione, guarda alcuni dei nostri ',
    footerBetweenTemplatesAndCourses: ', cerca ',
    footerAfterCourses: ' incorporabili o ',
    footerEnd: ' gia pubblicati.',
    examples: 'esempi',
    templates: 'modelli',
    courses: 'corsi',
    followUsOn: 'Seguici su:',
    idLabel: 'ID',
    edit: 'Modifica',
    exports: 'Esportazioni',
    untitled: 'Senza titolo',
    deleteAria: 'Elimina',
    deleteTitlePrefix: 'Elimina',
    deleteConfirmLine1: 'Vuoi davvero eliminare questo documento per sempre?',
    deleteConfirmLine2: 'Non puo essere ripristinato!',
    abort: 'Annulla',
    delete: 'Elimina',
    close: 'Chiudi',
  },
  nl: {
    newFunctionsTitle: 'Nieuwe functies',
    newFunctionsButton: 'Nieuwe functies',
    newFunctionsIntro:
      'Deze uitbreidingen zijn momenteel vooral proof-of-concepts. Ze laten de nieuwe workflows direct in de LiveEditor zien.',
    newFunctionsItems: [
      { title: 'Startdialoog', description: 'Een nieuwe cursus-overlay vraagt nu om naam, taal en merge-links voordat de editor opent.' },
      { title: 'Starterkaart', description: 'Het overzicht bevat nu een grote starterkaart waarmee je direct een cursus kunt maken en meteen naar de editor springt.' },
      { title: 'Lokalisatie', description: 'Het overzicht kan sommige ondersteunde talen nu lokaal omschakelen zonder Google Translate te gebruiken.' },
      { title: 'Donkere modus', description: 'Overzicht en editor ondersteunen nu direct schakelen tussen lichte en donkere modus.' },
      { title: 'Drag en drop in de editor', description: 'Media zoals afbeeldingen, audio en video kunnen direct in de editor worden neergezet.' },
      { title: 'Gebruiksvriendelijkere editorbesturing', description: 'Plus- en minknoppen in de editor maken veelgebruikte acties makkelijker bereikbaar.' },
      { title: 'Slepen in de live-voorbeeldweergave', description: 'Ten minste afbeeldingen kunnen nu direct in de voorbeeldweergave opnieuw worden geordend.' },
      { title: 'Meerdere links voor de start samenvoegen', description: 'Voor het openen van een nieuwe cursus kunnen meerdere Markdown-links worden ingevoerd en samengevoegd tot een document.' },
      { title: 'Samenvoegen via drag en drop in de editor', description: 'Een Markdown-link die in de editor wordt neergezet, wordt nu samengevoegd met het huidige document in plaats van alleen ingevoegd.' },
    ],
    switchThemeTitle: 'Wissel tussen lichte en donkere modus',
    translateOverviewTitle: 'Overzicht vertalen',
    newCourse: 'Nieuwe cursus',
    createNewCourseTitle: 'Nieuwe cursus maken',
    newCourseCardDescription: 'Maak direct vanuit het overzicht een nieuwe cursus met auteur, taal en optionele merge-links.',
    authorName: 'Auteur',
    yourName: 'Jouw naam',
    language: 'Taal',
    importLinkLabel: 'Cursusinhoud importeren via deze link',
    optionalMarkdownLink: 'Optionele link naar een Markdown-bestand',
    addMergeLink: 'Nog een merge-link toevoegen',
    linkLabel: 'Link',
    secondLinkLabel: 'Tweede link',
    optionalMergeLinkPrefix: 'Optionele merge-link',
    create: 'Maken',
    createNewCourseButton: 'Nieuwe cursus maken',
    searchPlaceholder: 'Typ om te zoeken...',
    clearSearch: 'Zoeken wissen',
    footerBeforeExamples: 'Dit is een collaboratieve online-editor voor ',
    footerBetweenExamplesAndTemplates: '. Alle inhoud wordt alleen in je browser opgeslagen. Heb je inspiratie nodig, bekijk dan enkele van onze ',
    footerBetweenTemplatesAndCourses: ', zoek naar insluitbare ',
    footerAfterCourses: ' of reeds gepubliceerde ',
    footerEnd: '.',
    examples: 'voorbeelden',
    templates: 'sjablonen',
    courses: 'cursussen',
    followUsOn: 'Volg ons op:',
    idLabel: 'ID',
    edit: 'Bewerken',
    exports: 'Exports',
    untitled: 'Zonder titel',
    deleteAria: 'Verwijderen',
    deleteTitlePrefix: 'Verwijderen',
    deleteConfirmLine1: 'Weet je zeker dat je dit document voorgoed wilt verwijderen?',
    deleteConfirmLine2: 'Het kan niet worden hersteld!',
    abort: 'Annuleren',
    delete: 'Verwijderen',
    close: 'Sluiten',
  },
  pt: {
    newFunctionsTitle: 'Novas funcoes',
    newFunctionsButton: 'Novas funcoes',
    newFunctionsIntro:
      'Estas adicoes sao atualmente sobretudo provas de conceito. Elas mostram os novos fluxos diretamente no LiveEditor.',
    newFunctionsItems: [
      { title: 'Dialogo inicial', description: 'Uma nova janela de curso agora pede nome, idioma e links de fusao antes de abrir o editor.' },
      { title: 'Cartao inicial', description: 'A visao geral agora inclui um grande cartao inicial para criar um curso diretamente e abrir o editor de imediato.' },
      { title: 'Localizacao', description: 'A visao geral agora pode mudar algumas linguas suportadas localmente sem depender do Google Translate.' },
      { title: 'Modo escuro', description: 'A visao geral e o editor agora suportam alternancia direta entre modo claro e escuro.' },
      { title: 'Arrastar e soltar no editor', description: 'Midias como imagens, audio e video podem ser soltas diretamente no editor.' },
      { title: 'Controles do editor mais amigaveis', description: 'Os botoes de mais e menos no editor facilitam o acesso a acoes frequentes.' },
      { title: 'Arrastar na pre-visualizacao ao vivo', description: 'Pelo menos as imagens agora podem ser reordenadas diretamente na area de pre-visualizacao.' },
      { title: 'Mesclar varios links antes de iniciar', description: 'Varios links Markdown podem ser inseridos antes de abrir um novo curso e unidos em um unico documento.' },
      { title: 'Mescla por arrastar e soltar no editor', description: 'Ao soltar um link Markdown no editor, ele agora e mesclado ao documento atual em vez de apenas inserido.' },
    ],
    switchThemeTitle: 'Alternar entre modo claro e escuro',
    translateOverviewTitle: 'Traduzir visao geral',
    newCourse: 'Novo curso',
    createNewCourseTitle: 'Criar novo curso',
    newCourseCardDescription: 'Crie um novo curso diretamente da visao geral com autor, idioma e links opcionais de mescla.',
    authorName: 'Autor',
    yourName: 'Seu nome',
    language: 'Idioma',
    importLinkLabel: 'Importar conteudo do curso deste link',
    optionalMarkdownLink: 'Link opcional para um arquivo Markdown',
    addMergeLink: 'Adicionar outro link de mescla',
    linkLabel: 'Link',
    secondLinkLabel: 'Segundo link',
    optionalMergeLinkPrefix: 'Link opcional de mescla',
    create: 'Criar',
    createNewCourseButton: 'Criar novo curso',
    searchPlaceholder: 'Digite para pesquisar...',
    clearSearch: 'Limpar pesquisa',
    footerBeforeExamples: 'Este e um editor colaborativo online para ',
    footerBetweenExamplesAndTemplates: '. Todo o conteudo e armazenado apenas no seu navegador. Se precisar de inspiracao, veja alguns dos nossos ',
    footerBetweenTemplatesAndCourses: ', procure ',
    footerAfterCourses: ' incorporaveis ou ',
    footerEnd: ' ja publicados.',
    examples: 'exemplos',
    templates: 'modelos',
    courses: 'cursos',
    followUsOn: 'Siga-nos em:',
    idLabel: 'ID',
    edit: 'Editar',
    exports: 'Exportacoes',
    untitled: 'Sem titulo',
    deleteAria: 'Excluir',
    deleteTitlePrefix: 'Excluir',
    deleteConfirmLine1: 'Tem certeza de que deseja excluir este documento para sempre?',
    deleteConfirmLine2: 'Ele nao pode ser restaurado!',
    abort: 'Cancelar',
    delete: 'Excluir',
    close: 'Fechar',
  },
  ru: {
    newFunctionsTitle: 'Novye funkcii',
    newFunctionsButton: 'Novye funkcii',
    newFunctionsIntro:
      'Eti dobavleniya poka yavlyayutsya prezhde vsego proverkoj kontseptsii. Oni pokazyvayut novye rabochie protsessy pryamo v LiveEditor.',
    newFunctionsItems: [
      { title: 'Startovoe okno', description: 'Novoe okno sozdaniya kursa teper sprashivaet imya, yazyk i ssylki dlya sliyaniya pered otkrytiem redaktora.' },
      { title: 'Startovaya kartochka', description: 'V obzore teper est bolshaya startovaya kartochka, cherez kotoruyu mozhno srazu sozdat kurs i pereyti v redaktor.' },
      { title: 'Lokalizaciya', description: 'Obzor teper mozhet lokalno pereklyuchat nekotorye podderzhivaemye yazyki bez zavisimosti ot Google Translate.' },
      { title: 'Temnyy rezhim', description: 'Obzor i redaktor teper podderzhivayut pryamoe pereklyuchenie mezhdu svetlym i temnym rezhimami.' },
      { title: 'Peretaskivanie v redaktor', description: 'Media, takie kak izobrazheniya, audio i video, mozhno peretaskivat pryamo v redaktor.' },
      { title: 'Bolee udobnye upravlyayushchie elementy redaktora', description: 'Knopki plyus i minus v redaktore uproshchayut dostup k chasto ispolzuemym deystviyam.' },
      { title: 'Peretaskivanie v zhivom predprosmotre', description: 'Po krayney mere izobrazheniya teper mozhno perestavlyat pryamo v oblasti predprosmotra.' },
      { title: 'Sliyanie neskolkih ssylok do starta', description: 'Do otkrytiya novogo kursa mozhno vvesti neskolko ssylok Markdown i obedinit ikh v odin dokument.' },
      { title: 'Sliyanie peretaskivaniem v redaktor', description: 'Pri peretaskivanii ssylki Markdown v redaktor ona teper obyedinyaetsya s tekushchim dokumentom vmesto prostoy vstavki.' },
    ],
    switchThemeTitle: 'Pereklyuchit svetlyy ili temnyy rezhim',
    translateOverviewTitle: 'Perevesti obzor',
    newCourse: 'Novyy kurs',
    createNewCourseTitle: 'Sozdat novyy kurs',
    newCourseCardDescription: 'Sozdavayte novyy kurs pryamo iz obzora s ukazaniem avtora, yazyka i neobyazatelnykh ssylok dlya sliyaniya.',
    authorName: 'Avtor',
    yourName: 'Vashe imya',
    language: 'Yazyk',
    importLinkLabel: 'Importirovat soderzhimoe kursa po etoy ssylke',
    optionalMarkdownLink: 'Neobyazatelnaya ssylka na fayl Markdown',
    addMergeLink: 'Dobavit eshche odnu ssylku dlya sliyaniya',
    linkLabel: 'Ssylka',
    secondLinkLabel: 'Vtoraya ssylka',
    optionalMergeLinkPrefix: 'Neobyazatelnaya ssylka dlya sliyaniya',
    create: 'Sozdat',
    createNewCourseButton: 'Sozdat novyy kurs',
    searchPlaceholder: 'Nachnite pechatat dlya poiska...',
    clearSearch: 'Ochistit poisk',
    footerBeforeExamples: 'Eto kollaborativnyy onlayn-redaktor dlya ',
    footerBetweenExamplesAndTemplates: '. Ves kontent khranitsya tolko v vashem brauzere. Esli nuzhno vdokhnovenie, posmotrite nekotorye iz nashikh ',
    footerBetweenTemplatesAndCourses: ', naydite vstraivaemye ',
    footerAfterCourses: ' ili uzhe opublikovannye ',
    footerEnd: '.',
    examples: 'primerov',
    templates: 'shablony',
    courses: 'kursy',
    followUsOn: 'My v setyakh:',
    idLabel: 'ID',
    edit: 'Redaktirovat',
    exports: 'Eksport',
    untitled: 'Bez nazvaniya',
    deleteAria: 'Udalit',
    deleteTitlePrefix: 'Udalit',
    deleteConfirmLine1: 'Vy deystvitelno khotite udalit etot dokument navsegda?',
    deleteConfirmLine2: 'Ego nelzya budet vosstanovit!',
    abort: 'Otmenit',
    delete: 'Udalit',
    close: 'Zakryt',
  },
  uk: {
    newFunctionsTitle: 'Novi funktsii',
    newFunctionsButton: 'Novi funktsii',
    newFunctionsIntro:
      'Tsi dodatky zaraz peredusim ye demonstratsieyu mozhlyvostei. Vony pokazuyut novi robotchi potoky bezposeredno v LiveEditor.',
    newFunctionsItems: [
      { title: 'Startove vikno', description: 'Nove vikno stvorennya kursu teper zapituye imya, movu ta posylannya dlya zlyttya pered vidkryttyam redaktora.' },
      { title: 'Startova kartka', description: 'V ohlyadi teper ye velika startova kartka, cherez yaku mozhna vidrazu stvoryty kurs i pereyty do redaktora.' },
      { title: 'Lokalizatsiya', description: 'Ohlyad teper mozhe lokalno pereklyuchaty deyaki pidtrymuvani movy bez zavisimosti vid Google Translate.' },
      { title: 'Temna tema', description: 'Ohlyad i redaktor teper pidtrymuyut shvydke pereklyuchennya mizh svitloyu ta temnoyu temamy.' },
      { title: 'Peretyaguvannya v redaktor', description: 'Media, taki yak zobrazhennya, audio ta video, mozhna peretyaguvaty pryamo v redaktor.' },
      { title: 'Zruchnishi elementy keruvannya redaktorom', description: 'Knopky plus ta minus u redaktori polyegshuyut dostup do poshyrenykh dii.' },
      { title: 'Peretyaguvannya v zhyvomu poperednomu perehlyadi', description: 'Prynaimni zobrazhennya teper mozhna pererostashovuvaty bezposeredno v oblasti poperednogo perehlyadu.' },
      { title: 'Obiednannya kilkokh posylan pered startom', description: 'Pered vidkryttyam novoho kursu mozhna vvesty kilka Markdown-posylan i obiednaty yikh v odyn dokument.' },
      { title: 'Obiednannya peretyaguvannyam u redaktor', description: 'Pid chas peretyaguvannya Markdown-posylannya v redaktor vono teper obiednuyetsya z potochnym dokumentom, a ne prosto vstavlyayetsya.' },
    ],
    switchThemeTitle: 'Peremknuty mizh svitloyu i temnoyu temoyu',
    translateOverviewTitle: 'Pereklasty ohlyad',
    newCourse: 'Novyy kurs',
    createNewCourseTitle: 'Stvoryty novyy kurs',
    newCourseCardDescription: 'Stvoryuyte novyy kurs pryamo z ohlyadu z avtorom, movoyu ta neobovyazkovymy posylannyamy dlya obiednannya.',
    authorName: 'Avtor',
    yourName: 'Vashe imya',
    language: 'Mova',
    importLinkLabel: 'Importuvaty vmist kursu z tsogo posylannya',
    optionalMarkdownLink: 'Neobovyazkove posylannya na fayl Markdown',
    addMergeLink: 'Dodaty shche odne posylannya dlya obiednannya',
    linkLabel: 'Posylannya',
    secondLinkLabel: 'Druhe posylannya',
    optionalMergeLinkPrefix: 'Neobovyazkove posylannya dlya obiednannya',
    create: 'Stvoryty',
    createNewCourseButton: 'Stvoryty novyy kurs',
    searchPlaceholder: 'Pochynayte drukuvaty dlya poshuku...',
    clearSearch: 'Ochystyty poshuk',
    footerBeforeExamples: 'Tse spilnyy onlayn-redaktor dlya ',
    footerBetweenExamplesAndTemplates: '. Uves vmist zberigayetsya lyshe u vashomu brauzeri. Yakshcho potribne natkhnennya, podyvitsya deyaki z nashykh ',
    footerBetweenTemplatesAndCourses: ', znaidit vbudovani ',
    footerAfterCourses: ' abo vzhe opublikovani ',
    footerEnd: '.',
    examples: 'prykladiv',
    templates: 'shablony',
    courses: 'kursy',
    followUsOn: 'Strezhte za namy na:',
    idLabel: 'ID',
    edit: 'Redahuvaty',
    exports: 'Eksport',
    untitled: 'Bez nazvy',
    deleteAria: 'Vydalyty',
    deleteTitlePrefix: 'Vydalyty',
    deleteConfirmLine1: 'Vy vpevneni, shcho khochete nazavzhdy vydalyty tsey dokument?',
    deleteConfirmLine2: 'Yoho nemozhlyvo bude vidnovyty!',
    abort: 'Skasuvaty',
    delete: 'Vydalyty',
    close: 'Zakryty',
  },
} as const

export function normalizeOverviewLanguage(language?: string) {
  if (!language) {
    return 'en'
  }

  const normalized = language.toLowerCase()
  const aliases: Record<string, string> = {
    de: 'de',
    en: 'en',
    es: 'es',
    fr: 'fr',
    it: 'it',
    nl: 'nl',
    pt: 'pt',
    ru: 'ru',
    ua: 'uk',
    uk: 'uk',
    ar: 'ar',
    bg: 'bg',
    fa: 'fa',
    hi: 'hi',
    ja: 'ja',
    ko: 'ko',
    sw: 'sw',
    zh: 'zh-CN',
    'zh-cn': 'zh-CN',
    'zh-tw': 'zh-TW',
    tw: 'zh-TW',
  }

  const direct = aliases[normalized]
  if (direct) {
    return direct
  }

  const short = normalized.split('-')[0]
  return aliases[short] || 'en'
}

export function supportsNativeOverviewLanguage(language?: string) {
  return nativeOverviewLanguages.has(normalizeOverviewLanguage(language))
}

export function getOverviewUi(language?: string) {
  const normalizedLanguage = normalizeOverviewLanguage(language)
  return overviewUi[normalizedLanguage as keyof typeof overviewUi] || overviewUi.en
}

export function readOverviewTranslationCookie() {
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${OVERVIEW_TRANSLATION_COOKIE}=`))

  if (!cookie) {
    return null
  }

  const value = decodeURIComponent(cookie.split('=')[1] || '')
  const targetLanguage = value.split('/').filter(Boolean)[1]

  return targetLanguage || null
}

export function writeOverviewTranslationCookie(language: string) {
  const value = `/en/${language}`
  const encoded = encodeURIComponent(value)

  document.cookie = `${OVERVIEW_TRANSLATION_COOKIE}=${encoded}; path=/; SameSite=Lax`

  const hostname = window.location.hostname
  if (hostname && hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    document.cookie = `${OVERVIEW_TRANSLATION_COOKIE}=${encoded}; path=/; domain=.${hostname}; SameSite=Lax`
  }
}

export function clearOverviewTranslationCookie() {
  writeOverviewTranslationCookie('en')
}

export function readStoredOverviewLanguage() {
  try {
    return localStorage.getItem(OVERVIEW_LANGUAGE_STORAGE_KEY)
  } catch (_error) {
    return null
  }
}

export function writeStoredOverviewLanguage(language: string) {
  try {
    localStorage.setItem(OVERVIEW_LANGUAGE_STORAGE_KEY, normalizeOverviewLanguage(language))
  } catch (_error) {}
}