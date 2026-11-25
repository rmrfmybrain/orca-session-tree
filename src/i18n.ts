// The panel's strings in the languages Orca itself ships; anything else falls back to English.
// Terms follow Orca's own translations (worktree, session, mark as read) so the two read alike.

interface Table {
  viewLabel: string
  viewTree: string
  viewRecent: string
  today: string
  yesterday: string
  earlier: string
  worktree: string
  /** Heading of the sessions at work or waiting for you. */
  now: string
  unreadSection: string
  /** Tooltip of an unread session's dot. */
  unreadDot: string
  markRead: string
  projects: string
  group: (name: string) => string
  newChatIn: (where: string) => string
  chatHere: { git: string; folder: string; group: string }
  inNewWorktree: string
  openAs: string
  chat: string
  worktreeName: string
  openWorktree: string
  older: string
  otherProjects: string
  noSessions: string
  sessions: (n: number) => string
  state: { working: string; blocked: string; waiting: string; done: string }
  /** Minutes, hours and days, and what goes between the number and the unit. */
  units: { m: string; h: string; d: string; sep: string }
  justNow: string
  loading: string
  nothingHint: string
  failed: string
  /** The right-click menu. */
  menu: {
    open: string
    markUnread: string
    closeTab: string
    newChat: string
    hideProject: string
    removeWorkspace: string
    deleteWorktree: string
    /** What removing a workspace entry does (a folder project's or a group's workspace). */
    removeWarn: string
    /** What deleting a worktree does. */
    deleteWarn: string
    remove: string
    delete: string
    cancel: string
  }
}

/** Russian noun form for n: 1 сессия, 2 сессии, 5 сессий, 21 сессия, 11 сессий. */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10
  const h = n % 100
  if (d === 1 && h !== 11) return one
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few
  return many
}

const TABLES: Record<string, Table> = {
  en: {
    viewLabel: 'View', viewTree: 'Projects', viewRecent: 'Recent',
    today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier', worktree: 'worktree',
    now: 'Now', unreadSection: 'Unread', unreadDot: 'finished, unread', markRead: 'Mark as read',
    projects: 'Projects', group: (name) => `${name} (group)`, newChatIn: (where) => `New chat in ${where}`,
    chatHere: { git: 'Without a worktree, in the main checkout', folder: 'In the project folder', group: 'In the group' },
    inNewWorktree: 'In a new worktree', openAs: 'Open as', chat: 'Chat',
    worktreeName: 'Task name (becomes the branch)', openWorktree: 'Open the worktree',
    older: 'Older', otherProjects: 'Other projects', noSessions: 'No open sessions',
    sessions: (n) => (n === 1 ? '1 session' : `${n} sessions`),
    state: { working: 'working', blocked: 'needs approval', waiting: 'waiting for you', done: 'ready' },
    units: { m: 'm', h: 'h', d: 'd', sep: '' }, justNow: 'now',
    loading: 'Reading Orca’s sessions…',
    nothingHint: 'Nothing is open. Press + next to a project to start a chat.',
    failed: 'That did not work',
    menu: {
      open: 'Open', markUnread: 'Mark as unread', closeTab: 'Close tab', newChat: 'New chat…',
      hideProject: 'Hide project in Orca', removeWorkspace: 'Remove workspace…', deleteWorktree: 'Delete worktree…',
      removeWarn: 'Orca forgets this workspace. Its files stay.',
      deleteWarn: 'The worktree folder is deleted; its branch stays. Orca refuses if it has uncommitted changes.',
      remove: 'Remove', delete: 'Delete', cancel: 'Cancel'
    }
  },
  ru: {
    viewLabel: 'Вид', viewTree: 'Проекты', viewRecent: 'Недавние',
    today: 'Сегодня', yesterday: 'Вчера', earlier: 'Раньше', worktree: 'ворктри',
    now: 'Сейчас', unreadSection: 'Не просмотрено', unreadDot: 'закончил, не просмотрено', markRead: 'Отметить просмотренным',
    projects: 'Проекты', group: (name) => `${name} (группа)`, newChatIn: (where) => `Новый чат в ${where}`,
    chatHere: { git: 'Без ворктри, в основном чекауте', folder: 'В папке проекта', group: 'В пространстве группы' },
    inNewWorktree: 'В новом ворктри', openAs: 'Открыть как', chat: 'Чат',
    worktreeName: 'Название задачи (станет веткой)', openWorktree: 'Открыть ворктри',
    older: 'Раньше', otherProjects: 'Остальные проекты', noSessions: 'Открытых сессий нет',
    sessions: (n) => `${n} ${plural(n, 'сессия', 'сессии', 'сессий')}`,
    state: { working: 'работает', blocked: 'нужно разрешение', waiting: 'ждёт тебя', done: 'готово' },
    units: { m: 'мин', h: 'ч', d: 'д', sep: ' ' }, justNow: 'сейчас',
    loading: 'Читаю сессии Orca…',
    nothingHint: 'Открытых сессий нет. Нажми + у проекта, чтобы начать чат.',
    failed: 'Не получилось',
    menu: {
      open: 'Открыть', markUnread: 'Отметить непросмотренным', closeTab: 'Закрыть вкладку', newChat: 'Новый чат…',
      hideProject: 'Скрыть проект в Orca', removeWorkspace: 'Убрать рабочее пространство…', deleteWorktree: 'Удалить ворктри…',
      removeWarn: 'Orca забудет это пространство, файлы останутся.',
      deleteWarn: 'Папка ворктри удалится, ветка останется. Если есть несохранённые изменения, Orca откажет.',
      remove: 'Убрать', delete: 'Удалить', cancel: 'Отмена'
    }
  },
  de: {
    viewLabel: 'Ansicht', viewTree: 'Projekte', viewRecent: 'Zuletzt',
    today: 'Heute', yesterday: 'Gestern', earlier: 'Früher', worktree: 'Worktree',
    now: 'Jetzt', unreadSection: 'Ungelesen', unreadDot: 'fertig, ungelesen', markRead: 'Als gelesen markieren',
    projects: 'Projekte', group: (name) => `${name} (Gruppe)`, newChatIn: (where) => `Neuer Chat in ${where}`,
    chatHere: { git: 'Ohne Worktree, im Haupt-Checkout', folder: 'Im Projektordner', group: 'In der Gruppe' },
    inNewWorktree: 'In einem neuen Worktree', openAs: 'Öffnen als', chat: 'Chat',
    worktreeName: 'Name der Aufgabe (wird zum Branch)', openWorktree: 'Worktree öffnen',
    older: 'Älter', otherProjects: 'Weitere Projekte', noSessions: 'Keine offenen Sitzungen',
    sessions: (n) => (n === 1 ? '1 Sitzung' : `${n} Sitzungen`),
    state: { working: 'arbeitet', blocked: 'braucht Freigabe', waiting: 'wartet auf dich', done: 'fertig' },
    units: { m: 'Min.', h: 'Std.', d: 'T.', sep: ' ' }, justNow: 'jetzt',
    loading: 'Orca-Sitzungen werden gelesen…',
    nothingHint: 'Nichts ist offen. Klicke auf + neben einem Projekt, um einen Chat zu starten.',
    failed: 'Das hat nicht geklappt',
    menu: {
      open: 'Öffnen', markUnread: 'Als ungelesen markieren', closeTab: 'Tab schließen', newChat: 'Neuer Chat…',
      hideProject: 'Projekt in Orca ausblenden', removeWorkspace: 'Arbeitsbereich entfernen…', deleteWorktree: 'Worktree löschen…',
      removeWarn: 'Orca vergisst diesen Arbeitsbereich. Die Dateien bleiben.',
      deleteWarn: 'Der Worktree-Ordner wird gelöscht, der Branch bleibt. Bei nicht committeten Änderungen lehnt Orca ab.',
      remove: 'Entfernen', delete: 'Löschen', cancel: 'Abbrechen'
    }
  },
  es: {
    viewLabel: 'Vista', viewTree: 'Proyectos', viewRecent: 'Recientes',
    today: 'Hoy', yesterday: 'Ayer', earlier: 'Antes', worktree: 'worktree',
    now: 'Ahora', unreadSection: 'Sin leer', unreadDot: 'terminado, sin leer', markRead: 'Marcar como leído',
    projects: 'Proyectos', group: (name) => `${name} (grupo)`, newChatIn: (where) => `Nuevo chat en ${where}`,
    chatHere: { git: 'Sin worktree, en el checkout principal', folder: 'En la carpeta del proyecto', group: 'En el grupo' },
    inNewWorktree: 'En un worktree nuevo', openAs: 'Abrir como', chat: 'Chat',
    worktreeName: 'Nombre de la tarea (será la rama)', openWorktree: 'Abrir el worktree',
    older: 'Más antiguas', otherProjects: 'Otros proyectos', noSessions: 'No hay sesiones abiertas',
    sessions: (n) => (n === 1 ? '1 sesión' : `${n} sesiones`),
    state: { working: 'trabajando', blocked: 'necesita aprobación', waiting: 'esperándote', done: 'listo' },
    units: { m: 'min', h: 'h', d: 'd', sep: ' ' }, justNow: 'ahora',
    loading: 'Leyendo las sesiones de Orca…',
    nothingHint: 'No hay nada abierto. Pulsa + junto a un proyecto para empezar un chat.',
    failed: 'No funcionó',
    menu: {
      open: 'Abrir', markUnread: 'Marcar como no leído', closeTab: 'Cerrar pestaña', newChat: 'Nuevo chat…',
      hideProject: 'Ocultar proyecto en Orca', removeWorkspace: 'Eliminar espacio de trabajo…', deleteWorktree: 'Eliminar worktree…',
      removeWarn: 'Orca olvida este espacio de trabajo. Los archivos se conservan.',
      deleteWarn: 'Se borra la carpeta del worktree; la rama se conserva. Orca se niega si hay cambios sin confirmar.',
      remove: 'Eliminar', delete: 'Eliminar', cancel: 'Cancelar'
    }
  },
  fr: {
    viewLabel: 'Vue', viewTree: 'Projets', viewRecent: 'Récents',
    today: 'Aujourd’hui', yesterday: 'Hier', earlier: 'Plus tôt', worktree: 'worktree',
    now: 'En cours', unreadSection: 'Non lus', unreadDot: 'terminé, non lu', markRead: 'Marquer comme lu',
    projects: 'Projets', group: (name) => `${name} (groupe)`, newChatIn: (where) => `Nouveau chat dans ${where}`,
    chatHere: { git: 'Sans worktree, dans le checkout principal', folder: 'Dans le dossier du projet', group: 'Dans le groupe' },
    inNewWorktree: 'Dans un nouveau worktree', openAs: 'Ouvrir en', chat: 'Chat',
    worktreeName: 'Nom de la tâche (devient la branche)', openWorktree: 'Ouvrir le worktree',
    older: 'Plus anciennes', otherProjects: 'Autres projets', noSessions: 'Aucune session ouverte',
    sessions: (n) => (n <= 1 ? `${n} session` : `${n} sessions`),
    state: { working: 'en cours', blocked: 'approbation requise', waiting: 'vous attend', done: 'terminé' },
    units: { m: 'min', h: 'h', d: 'j', sep: ' ' }, justNow: 'maintenant',
    loading: 'Lecture des sessions Orca…',
    nothingHint: 'Rien n’est ouvert. Appuyez sur + à côté d’un projet pour lancer un chat.',
    failed: 'Cela n’a pas fonctionné',
    menu: {
      open: 'Ouvrir', markUnread: 'Marquer comme non lu', closeTab: 'Fermer l’onglet', newChat: 'Nouveau chat…',
      hideProject: 'Masquer le projet dans Orca', removeWorkspace: 'Retirer l’espace de travail…', deleteWorktree: 'Supprimer le worktree…',
      removeWarn: 'Orca oublie cet espace de travail. Les fichiers restent.',
      deleteWarn: 'Le dossier du worktree est supprimé ; la branche reste. Orca refuse s’il y a des modifications non validées.',
      remove: 'Retirer', delete: 'Supprimer', cancel: 'Annuler'
    }
  },
  pt: {
    viewLabel: 'Visualização', viewTree: 'Projetos', viewRecent: 'Recentes',
    today: 'Hoje', yesterday: 'Ontem', earlier: 'Antes', worktree: 'worktree',
    now: 'Agora', unreadSection: 'Não lidas', unreadDot: 'concluída, não lida', markRead: 'Marcar como lido',
    projects: 'Projetos', group: (name) => `${name} (grupo)`, newChatIn: (where) => `Novo chat em ${where}`,
    chatHere: { git: 'Sem worktree, no checkout principal', folder: 'Na pasta do projeto', group: 'No grupo' },
    inNewWorktree: 'Em um novo worktree', openAs: 'Abrir como', chat: 'Chat',
    worktreeName: 'Nome da tarefa (vira o branch)', openWorktree: 'Abrir o worktree',
    older: 'Mais antigas', otherProjects: 'Outros projetos', noSessions: 'Nenhuma sessão aberta',
    sessions: (n) => (n === 1 ? '1 sessão' : `${n} sessões`),
    state: { working: 'trabalhando', blocked: 'precisa de aprovação', waiting: 'esperando você', done: 'pronta' },
    units: { m: 'min', h: 'h', d: 'd', sep: ' ' }, justNow: 'agora',
    loading: 'Lendo as sessões do Orca…',
    nothingHint: 'Nada aberto. Clique em + ao lado de um projeto para iniciar um chat.',
    failed: 'Não deu certo',
    menu: {
      open: 'Abrir', markUnread: 'Marcar como não lido', closeTab: 'Fechar aba', newChat: 'Novo chat…',
      hideProject: 'Ocultar projeto no Orca', removeWorkspace: 'Remover espaço de trabalho…', deleteWorktree: 'Excluir worktree…',
      removeWarn: 'O Orca esquece este espaço de trabalho. Os arquivos ficam.',
      deleteWarn: 'A pasta do worktree é excluída; o branch fica. O Orca recusa se houver alterações não commitadas.',
      remove: 'Remover', delete: 'Excluir', cancel: 'Cancelar'
    }
  },
  tr: {
    viewLabel: 'Görünüm', viewTree: 'Projeler', viewRecent: 'Son',
    today: 'Bugün', yesterday: 'Dün', earlier: 'Daha önce', worktree: 'worktree',
    now: 'Şimdi', unreadSection: 'Okunmamış', unreadDot: 'bitti, okunmadı', markRead: 'Okundu olarak işaretle',
    projects: 'Projeler', group: (name) => `${name} (grup)`, newChatIn: (where) => `${where} içinde yeni sohbet`,
    chatHere: { git: 'Worktree olmadan, ana checkout’ta', folder: 'Proje klasöründe', group: 'Grupta' },
    inNewWorktree: 'Yeni bir worktree’de', openAs: 'Şöyle aç', chat: 'Sohbet',
    worktreeName: 'Görev adı (dal adı olur)', openWorktree: 'Worktree’yi aç',
    older: 'Daha eski', otherProjects: 'Diğer projeler', noSessions: 'Açık oturum yok',
    sessions: (n) => `${n} oturum`,
    state: { working: 'çalışıyor', blocked: 'onay gerekiyor', waiting: 'seni bekliyor', done: 'hazır' },
    units: { m: 'dk', h: 'sa', d: 'g', sep: ' ' }, justNow: 'şimdi',
    loading: 'Orca oturumları okunuyor…',
    nothingHint: 'Açık bir şey yok. Sohbet başlatmak için bir projenin yanındaki + düğmesine bas.',
    failed: 'Olmadı',
    menu: {
      open: 'Aç', markUnread: 'Okunmadı olarak işaretle', closeTab: 'Sekmeyi kapat', newChat: 'Yeni sohbet…',
      hideProject: 'Projeyi Orca’da gizle', removeWorkspace: 'Çalışma alanını kaldır…', deleteWorktree: 'Worktree’yi sil…',
      removeWarn: 'Orca bu çalışma alanını unutur. Dosyalar kalır.',
      deleteWarn: 'Worktree klasörü silinir, dal kalır. Commit edilmemiş değişiklik varsa Orca reddeder.',
      remove: 'Kaldır', delete: 'Sil', cancel: 'İptal'
    }
  },
  ja: {
    viewLabel: '表示', viewTree: 'プロジェクト', viewRecent: '最近',
    today: '今日', yesterday: '昨日', earlier: 'それ以前', worktree: 'ワークツリー',
    now: '進行中', unreadSection: '未読', unreadDot: '完了・未読', markRead: '既読にする',
    projects: 'プロジェクト', group: (name) => `${name}（グループ）`, newChatIn: (where) => `${where} で新しいチャット`,
    chatHere: { git: 'ワークツリーなし（メインのチェックアウト）', folder: 'プロジェクトフォルダー内', group: 'グループ内' },
    inNewWorktree: '新しいワークツリーで', openAs: '開く形式', chat: 'チャット',
    worktreeName: 'タスク名（ブランチ名になります）', openWorktree: 'ワークツリーを開く',
    older: '以前', otherProjects: 'その他のプロジェクト', noSessions: '開いているセッションはありません',
    sessions: (n) => `${n} セッション`,
    state: { working: '作業中', blocked: '承認が必要', waiting: '返答待ち', done: '完了' },
    units: { m: '分', h: '時間', d: '日', sep: '' }, justNow: 'たった今',
    loading: 'Orca のセッションを読み込み中…',
    nothingHint: '開いているものはありません。プロジェクトの横の + を押してチャットを始めましょう。',
    failed: 'うまくいきませんでした',
    menu: {
      open: '開く', markUnread: '未読にする', closeTab: 'タブを閉じる', newChat: '新しいチャット…',
      hideProject: 'Orca でプロジェクトを非表示', removeWorkspace: 'ワークスペースを削除…', deleteWorktree: 'ワークツリーを削除…',
      removeWarn: 'Orca からこのワークスペースを外します。ファイルはそのまま残ります。',
      deleteWarn: 'ワークツリーのフォルダーは削除され、ブランチは残ります。未コミットの変更がある場合、Orca は削除しません。',
      remove: '削除', delete: '削除', cancel: 'キャンセル'
    }
  },
  ko: {
    viewLabel: '보기', viewTree: '프로젝트', viewRecent: '최근',
    today: '오늘', yesterday: '어제', earlier: '이전', worktree: '워크트리',
    now: '진행 중', unreadSection: '읽지 않음', unreadDot: '완료됨, 읽지 않음', markRead: '읽음으로 표시',
    projects: '프로젝트', group: (name) => `${name} (그룹)`, newChatIn: (where) => `${where}에서 새 채팅`,
    chatHere: { git: '워크트리 없이, 메인 체크아웃에서', folder: '프로젝트 폴더에서', group: '그룹에서' },
    inNewWorktree: '새 워크트리에서', openAs: '열기 방식', chat: '채팅',
    worktreeName: '작업 이름 (브랜치 이름이 됨)', openWorktree: '워크트리 열기',
    older: '이전', otherProjects: '다른 프로젝트', noSessions: '열린 세션 없음',
    sessions: (n) => `세션 ${n}개`,
    state: { working: '작업 중', blocked: '승인 필요', waiting: '응답 대기 중', done: '완료' },
    units: { m: '분', h: '시간', d: '일', sep: '' }, justNow: '방금',
    loading: 'Orca 세션을 읽는 중…',
    nothingHint: '열린 항목이 없습니다. 프로젝트 옆의 +를 눌러 채팅을 시작하세요.',
    failed: '실패했습니다',
    menu: {
      open: '열기', markUnread: '읽지 않음으로 표시', closeTab: '탭 닫기', newChat: '새 채팅…',
      hideProject: 'Orca에서 프로젝트 숨기기', removeWorkspace: '워크스페이스 제거…', deleteWorktree: '워크트리 삭제…',
      removeWarn: 'Orca에서 이 워크스페이스를 제거합니다. 파일은 그대로 남습니다.',
      deleteWarn: '워크트리 폴더는 삭제되고 브랜치는 남습니다. 커밋하지 않은 변경 사항이 있으면 Orca가 거부합니다.',
      remove: '제거', delete: '삭제', cancel: '취소'
    }
  },
  zh: {
    viewLabel: '视图', viewTree: '项目', viewRecent: '最近',
    today: '今天', yesterday: '昨天', earlier: '更早', worktree: '工作树',
    now: '进行中', unreadSection: '未读', unreadDot: '已完成，未读', markRead: '标为已读',
    projects: '项目', group: (name) => `${name}（分组）`, newChatIn: (where) => `在 ${where} 中新建聊天`,
    chatHere: { git: '不使用工作树，在主检出中', folder: '在项目文件夹中', group: '在分组中' },
    inNewWorktree: '在新的工作树中', openAs: '打开方式', chat: '聊天',
    worktreeName: '任务名称（将作为分支名）', openWorktree: '打开工作树',
    older: '更早', otherProjects: '其他项目', noSessions: '没有打开的会话',
    sessions: (n) => `${n} 个会话`,
    state: { working: '工作中', blocked: '需要批准', waiting: '等待你回复', done: '已完成' },
    units: { m: '分钟', h: '小时', d: '天', sep: ' ' }, justNow: '刚刚',
    loading: '正在读取 Orca 会话…',
    nothingHint: '没有打开的会话。点击项目旁的 + 开始聊天。',
    failed: '操作失败',
    menu: {
      open: '打开', markUnread: '标记为未读', closeTab: '关闭选项卡', newChat: '新建聊天…',
      hideProject: '在 Orca 中隐藏项目', removeWorkspace: '移除工作区…', deleteWorktree: '删除工作树…',
      removeWarn: 'Orca 将移除此工作区，文件会保留。',
      deleteWarn: '工作树文件夹会被删除，分支会保留。如有未提交的更改，Orca 会拒绝。',
      remove: '移除', delete: '删除', cancel: '取消'
    }
  },
  'zh-Hant': {
    viewLabel: '檢視', viewTree: '專案', viewRecent: '最近',
    today: '今天', yesterday: '昨天', earlier: '更早', worktree: '工作樹',
    now: '進行中', unreadSection: '未讀', unreadDot: '已完成，未讀', markRead: '標為已讀',
    projects: '專案', group: (name) => `${name}（群組）`, newChatIn: (where) => `在 ${where} 中新增聊天`,
    chatHere: { git: '不使用工作樹，在主要簽出中', folder: '在專案資料夾中', group: '在群組中' },
    inNewWorktree: '在新的工作樹中', openAs: '開啟方式', chat: '聊天',
    worktreeName: '任務名稱（將作為分支名稱）', openWorktree: '開啟工作樹',
    older: '更早', otherProjects: '其他專案', noSessions: '沒有開啟的工作階段',
    sessions: (n) => `${n} 個工作階段`,
    state: { working: '工作中', blocked: '需要核准', waiting: '等待你回覆', done: '已完成' },
    units: { m: '分鐘', h: '小時', d: '天', sep: ' ' }, justNow: '剛剛',
    loading: '正在讀取 Orca 工作階段…',
    nothingHint: '沒有開啟的工作階段。按專案旁的 + 開始聊天。',
    failed: '操作失敗',
    menu: {
      open: '開啟', markUnread: '標記為未讀', closeTab: '關閉分頁', newChat: '新增聊天…',
      hideProject: '在 Orca 中隱藏專案', removeWorkspace: '移除工作區…', deleteWorktree: '刪除工作樹…',
      removeWarn: 'Orca 會移除此工作區，檔案會保留。',
      deleteWarn: '工作樹資料夾會被刪除，分支會保留。若有未提交的變更，Orca 會拒絕。',
      remove: '移除', delete: '刪除', cancel: '取消'
    }
  }
}

/** Orca's language tag to one of the tables: `pt-BR` reads `pt`, `zh-TW` and `zh-Hant` read `zh-Hant`. */
export function tableFor(locale: string | undefined): string {
  const tag = (locale ?? '').toLowerCase()
  if (tag.startsWith('zh')) return /hant|tw|hk|mo/.test(tag) ? 'zh-Hant' : 'zh'
  const base = tag.split(/[-_]/)[0]
  return base in TABLES ? base : 'en'
}

/** Whole minutes, hours or days in `ms`; null under a minute. */
function age(ms: number): [number, 'm' | 'h' | 'd'] | null {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return null
  if (minutes < 60) return [minutes, 'm']
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return [hours, 'h']
  return [Math.floor(hours / 24), 'd']
}

export function strings(locale: string | undefined) {
  const t = TABLES[tableFor(locale)]
  const count = (label: string) => (n: number) => `${label} · ${n}`
  return {
    viewLabel: t.viewLabel,
    viewTree: t.viewTree,
    viewRecent: t.viewRecent,
    day: { today: t.today, yesterday: t.yesterday, older: t.earlier } as Record<string, string>,
    worktree: t.worktree,
    activeCount: count(t.now),
    unreadCount: count(t.unreadSection),
    unread: t.unreadDot,
    markRead: t.markRead,
    projects: t.projects,
    group: t.group,
    newChatIn: t.newChatIn,
    chatHere: t.chatHere as Record<string, string>,
    inNewWorktree: t.inNewWorktree,
    openAs: t.openAs,
    surfaceChat: t.chat,
    surfaceCli: 'CLI',
    worktreeName: t.worktreeName,
    openWorktree: t.openWorktree,
    older: count(t.older),
    otherProjects: count(t.otherProjects),
    noSessions: t.noSessions,
    sessionsCount: t.sessions,
    state: t.state as Record<string, string>,
    ago: (ms: number) => {
      const a = age(ms)
      return a ? `${a[0]}${t.units.sep}${t.units[a[1]]}` : t.justNow
    },
    loading: t.loading,
    nothingHint: t.nothingHint,
    failed: t.failed,
    menu: t.menu
  }
}
