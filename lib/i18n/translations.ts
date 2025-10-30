export interface Translation {
  // Header
  appName: string;
  tagline: string;

  // Navigation
  howItWorks: string;
  connectWallet: string;

  // Tabs
  deposit: string;
  send: string;
  backup: string;

  // Tab descriptions
  depositDescription: string;
  sendDescription: string;
  backupDescription: string;

  // Pool stats
  poolStats: string;
  totalDeposits: string;
  totalWithdrawals: string;
  poolBalance: string;
  queueLength: string;
  anonymitySet: string;

  // Deposit form
  depositToPool: string;
  sendPrivately: string;
  amount: string;
  fixedAmount: string;
  recipientAddress: string;
  delayTime: string;
  minutes: string;
  confirmDeposit: string;
  confirmSend: string;

  // Status messages
  depositing: string;
  sending: string;
  confirmingTransaction: string;
  waitingForConfirmation: string;

  // Success messages
  depositSuccess: string;
  sendSuccess: string;
  withdrawalCompleted: string;
  changeDeposited: string;

  // Error messages
  pleaseConnectWallet: string;
  contractNotDeployed: string;
  blockchainNotReady: string;
  invalidRecipientAddress: string;
  transactionFailed: string;
  transactionCancelled: string;
  withdrawalQueueFailed: string;
  insufficientBalance: string;

  // Backup section
  backupTitle: string;
  backupButton: string;
  restoreButton: string;
  noDepositsToBackup: string;
  backupSuccessful: string;
  restoreSuccessful: string;
  invalidBackupFile: string;
  backupSecurityWarningTitle: string;
  backupSecurityWarningText: string;
  exportBackupTitle: string;
  exportBackupDescription: string;
  exportBackupButton: string;
  importBackupTitle: string;
  importBackupDescription: string;
  importBackupButton: string;
  bestPracticesTitle: string;
  bestPractice1: string;
  bestPractice2: string;
  bestPractice3: string;
  bestPractice4: string;

  // Transaction history
  transactionHistory: string;
  viewHistory: string;
  exportHistory: string;
  noTransactions: string;
  depositTransaction: string;
  withdrawalTransaction: string;
  pending: string;
  deposited: string;
  queued: string;
  completed: string;
  failed: string;
  processing: string;
  transactions: string;
  transaction: string;
  sortedByNewest: string;
  loadingFromBlockchain: string;
  fetchingRealTimeStatus: string;
  noTransactionHistory: string;
  transactionsWillAppear: string;
  commitment: string;
  type: string;
  timeRemaining: string;
  viewDeposit: string;
  viewQueue: string;
  viewWithdrawal: string;
  retryWithdrawal: string;
  page: string;
  of: string;
  total: string;
  refreshingFromBlockchain: string;

  // Privacy features
  privacyFeatures: string;
  anonymousDeposits: string;
  timeDelayedWithdrawals: string;
  merkleTreeProofs: string;

  // How it works modal
  howItWorksTitle: string;
  step1Title: string;
  step1Description: string;
  step2Title: string;
  step2Description: string;
  step3Title: string;
  step3Description: string;
  step4Title: string;
  step4Description: string;
  previous: string;
  next: string;
  getStarted: string;

  // How it works visual labels
  nullifier: string;
  secret: string;
  commitmentHash: string;
  storedOnBlockchain: string;
  provesOwnership: string;
  note: string;
  credentialsStoredLocally: string;
  privacyNote: string;
  blockchainOnlySees: string;
  commitmentVerified: string;
  notDoubleSpent: string;
  merkleProof: string;
  inPool: string;
  queuedCheckmark: string;
  withdrawalQueued: string;
  automatedProcessing: string;
  relayerChecksQueue: string;
  callsProcessWithdrawals: string;
  transfersToRecipient: string;
  marksNullifierSpent: string;
  pool: string;
  relayer: string;
  privacyAchieved: string;
  sentFromRelayer: string;
  noOnchainLink: string;
  untraceableInSet: string;
  commitmentInserted: string;
  merkleRootUpdated: string;
  depositAnonymous: string;

  // Welcome modal
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeFeature1Title: string;
  welcomeFeature1Description: string;
  welcomeFeature2Title: string;
  welcomeFeature2Description: string;
  welcomeFeature3Title: string;
  welcomeFeature3Description: string;
  welcomeFeature4Title: string;
  welcomeFeature4Description: string;
  welcomeWarningTitle: string;
  welcomeWarningDescription: string;
  welcomeSecurityTitle: string;
  welcomeSecurityDescription: string;
  welcomeCTA: string;

  // Misc
  viewTransaction: string;
  confirm: string;
  cancel: string;
  close: string;
  retry: string;
  refresh: string;
  loading: string;
  syncing: string;
  yourWallet: string;
  smartContract: string;
  recipient: string;
  status: string;

  // Fee discount
  feeDiscountEligible: string;
  feeDiscountNotEligible: string;
  tokenBalance: string;
  holdingTokens: string;
}

export const translations: Record<'en' | 'zh', Translation> = {
  en: {
    // Header
    appName: 'AnonBNB',
    tagline: 'Fully Private BNB Transfers',

    // Navigation
    howItWorks: 'How It Works',
    connectWallet: 'Connect Wallet',

    // Tabs
    deposit: 'Deposit',
    send: 'Send',
    backup: 'Backup',

    // Tab descriptions
    depositDescription: 'Add BNB to your private balance',
    sendDescription: 'Send from your private balance to any address',
    backupDescription: 'Export or import your deposit credentials',

    // Pool stats
    poolStats: 'Pool Statistics',
    totalDeposits: 'Total Deposits',
    totalWithdrawals: 'Total Withdrawals',
    poolBalance: 'Pool Balance',
    queueLength: 'Queue Length',
    anonymitySet: 'Anonymity Set',

    // Deposit form
    depositToPool: 'Deposit to Pool',
    sendPrivately: 'Send Privately',
    amount: 'Amount',
    fixedAmount: 'Fixed at 0.01 BNB per deposit',
    recipientAddress: 'Recipient Address',
    delayTime: 'Delay Time',
    minutes: 'minutes',
    confirmDeposit: 'Confirm Deposit',
    confirmSend: 'Confirm Send',

    // Status messages
    depositing: 'Depositing',
    sending: 'Sending',
    confirmingTransaction: 'Confirming transaction',
    waitingForConfirmation: 'Waiting for confirmation',

    // Success messages
    depositSuccess: 'Deposit successful!',
    sendSuccess: 'Withdrawal queued successfully!',
    withdrawalCompleted: 'Withdrawal Completed!',
    changeDeposited: 'Change Deposited!',

    // Error messages
    pleaseConnectWallet: 'Please connect your wallet first',
    contractNotDeployed: 'Contract not deployed',
    blockchainNotReady: 'Blockchain connection not ready',
    invalidRecipientAddress: 'Invalid recipient address',
    transactionFailed: 'Transaction Failed',
    transactionCancelled: 'Transaction Cancelled',
    withdrawalQueueFailed: 'Withdrawal Queue Failed',
    insufficientBalance: 'Insufficient balance',

    // Backup section
    backupTitle: 'Backup & Restore',
    backupButton: 'Backup Deposits',
    restoreButton: 'Restore from Backup',
    noDepositsToBackup: 'No deposits to backup',
    backupSuccessful: 'Backup downloaded successfully',
    restoreSuccessful: 'Deposits restored successfully',
    invalidBackupFile: 'Invalid backup file format',
    backupSecurityWarningTitle: 'Important Security Information',
    backupSecurityWarningText: 'Your deposit credentials (nullifier & secret) are stored ONLY in your browser\'s localStorage. They are NEVER sent to any server or stored on the blockchain. If you clear your browser data or use a different device, you\'ll need this backup to access your deposits.',
    exportBackupTitle: 'Export Backup',
    exportBackupDescription: 'Download a JSON file containing all your deposit credentials. Store it securely - anyone with this file can withdraw your deposits!',
    exportBackupButton: 'Export Backup File',
    importBackupTitle: 'Import Backup',
    importBackupDescription: 'Restore your deposit credentials from a previously exported backup file.',
    importBackupButton: 'Import Backup File',
    bestPracticesTitle: '💡 Best Practices',
    bestPractice1: 'Export backup immediately after making deposits',
    bestPractice2: 'Store backup file in a secure location (encrypted USB, password manager, etc.)',
    bestPractice3: 'Never share your backup file with anyone',
    bestPractice4: 'Create new backups after each deposit session',

    // Transaction history
    transactionHistory: 'Transaction History',
    viewHistory: 'View History',
    exportHistory: 'Export History',
    noTransactions: 'No transactions yet',
    depositTransaction: 'Deposit',
    withdrawalTransaction: 'Withdrawal',
    pending: 'Pending',
    deposited: 'Deposited',
    queued: 'Queued',
    completed: 'Completed',
    failed: 'Failed',
    processing: 'Processing',
    transactions: 'transactions',
    transaction: 'transaction',
    sortedByNewest: 'Sorted by newest first',
    loadingFromBlockchain: 'Loading from blockchain...',
    fetchingRealTimeStatus: 'Fetching real-time transaction status',
    noTransactionHistory: 'No transaction history',
    transactionsWillAppear: 'Your completed and pending transactions will appear here',
    commitment: 'Commitment',
    type: 'Type',
    timeRemaining: 'Time Remaining',
    viewDeposit: 'View Deposit',
    viewQueue: 'View Queue',
    viewWithdrawal: 'View Withdrawal',
    retryWithdrawal: 'Retry Withdrawal',
    page: 'Page',
    of: 'of',
    total: 'total',
    refreshingFromBlockchain: 'Refreshing from blockchain...',

    // Privacy features
    privacyFeatures: 'Privacy Features',
    anonymousDeposits: 'Anonymous Deposits',
    timeDelayedWithdrawals: 'Time-Delayed Withdrawals',
    merkleTreeProofs: 'Merkle Tree Proofs',

    // How it works modal
    howItWorksTitle: 'How It Works',
    step1Title: '1. Generate Your Secret Credentials',
    step1Description: 'When you initiate a deposit, the app generates two cryptographically secure random 32-byte (256-bit) values using your browser\'s crypto.getRandomValues(). These are your nullifier and secret - the keys to your deposit.',
    step2Title: '2. Deposit to Privacy Pool & Merkle Tree',
    step2Description: 'You send BNB along with your commitment hash to the smart contract. The contract adds your commitment to a 20-level binary Merkle tree (supports up to 1,048,576 deposits). The contract only knows the commitment hash - it has NO knowledge of your nullifier, secret, or future withdrawal address.',
    step3Title: '3. Queue Withdrawal with Cryptographic Proof',
    step3Description: 'When ready to withdraw, you provide your nullifier and secret. The contract verifies ownership by recomputing the commitment hash, generates a nullifier hash to prevent double-spending, and validates your Merkle proof. Your withdrawal is then queued with your chosen time delay.',
    step4Title: '4. Automated Relayer Executes Withdrawal',
    step4Description: 'After your delay expires, our relayer service automatically processes the withdrawal. It sends BNB from the pool to your recipient using the relayer\'s wallet, completely breaking the on-chain link between your deposit and the final recipient.',
    previous: 'Previous',
    next: 'Next',
    getStarted: 'Get Started',

    // How it works visual labels
    nullifier: 'Nullifier',
    secret: 'Secret',
    commitmentHash: 'Commitment Hash (Public)',
    storedOnBlockchain: 'Stored on blockchain',
    provesOwnership: 'Proves ownership without revealing identity',
    note: 'Note',
    credentialsStoredLocally: 'These credentials are stored ONLY in your browser\'s localStorage. Never share them or you\'ll lose your funds!',
    privacyNote: 'Privacy Note',
    blockchainOnlySees: 'The blockchain only sees: [Wallet Address] → [Commitment Hash]. Your nullifier and secret remain private in your browser.',
    commitmentVerified: 'Commitment verified',
    notDoubleSpent: 'Not double-spent',
    merkleProof: 'Merkle proof (20 hashes)',
    inPool: 'In pool',
    queuedCheckmark: 'Queued ✓',
    withdrawalQueued: 'Withdrawal queued - No on-chain link to depositor!',
    automatedProcessing: 'Automated Processing',
    relayerChecksQueue: 'Relayer checks queue every 60s',
    callsProcessWithdrawals: 'Calls processWithdrawals() after delay',
    transfersToRecipient: 'Transfers 0.0996 BNB to recipient',
    marksNullifierSpent: 'Marks nullifier as spent',
    pool: 'Pool',
    relayer: 'Relayer',
    privacyAchieved: 'Privacy Achieved!',
    sentFromRelayer: 'Sent from relayer wallet (not yours)',
    noOnchainLink: 'No on-chain link to depositor',
    untraceableInSet: 'Untraceable in anonymity set',
    commitmentInserted: 'Commitment inserted at leaf index',
    merkleRootUpdated: 'Merkle root updated on-chain',
    depositAnonymous: 'Your deposit is now anonymous in the pool',

    // Welcome modal
    welcomeTitle: 'Welcome to AnonBNB',
    welcomeSubtitle: 'The First Fully Automated Privacy Mixer on BNB Chain',
    welcomeFeature1Title: 'Fixed 0.01 BNB Deposits',
    welcomeFeature1Description: 'All deposits are exactly 0.01 BNB for maximum anonymity',
    welcomeFeature2Title: 'Automated Relayer System',
    welcomeFeature2Description: 'Withdrawals are automatically processed after your chosen delay',
    welcomeFeature3Title: 'Time-Delayed Privacy',
    welcomeFeature3Description: 'Choose delays from 5 minutes to 24 hours to break timing analysis',
    welcomeFeature4Title: 'Merkle Tree Privacy',
    welcomeFeature4Description: 'Your deposits are hidden in a cryptographic Merkle tree',
    welcomeWarningTitle: 'Critical Security Warning',
    welcomeWarningDescription: 'Your deposit credentials are stored ONLY in your browser. Always backup after depositing or you will lose your funds permanently.',
    welcomeSecurityTitle: 'Best Practices',
    welcomeSecurityDescription: 'Click "Backup" tab immediately after each deposit, never share your credentials, and store backups securely offline.',
    welcomeCTA: 'I Understand - Let\'s Start',

    // Misc
    viewTransaction: 'View Transaction',
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    retry: 'Retry',
    refresh: 'Refresh',
    loading: 'Loading',
    syncing: 'Syncing',
    yourWallet: 'Your Wallet',
    smartContract: 'Smart Contract',
    recipient: 'Recipient',
    status: 'Status',

    // Fee discount
    feeDiscountEligible: 'Eligible for Fee Discount',
    feeDiscountNotEligible: 'Not Eligible for Fee Discount',
    tokenBalance: 'Token Balance',
    holdingTokens: 'Holding Tokens',
  },

  zh: {
    // Header
    appName: 'AnonBNB',
    tagline: '完全隐私的BNB转账',

    // Navigation
    howItWorks: '工作原理',
    connectWallet: '连接钱包',

    // Tabs
    deposit: '存款',
    send: '发送',
    backup: '备份',

    // Tab descriptions
    depositDescription: '向您的隐私余额添加BNB',
    sendDescription: '从您的隐私余额发送到任何地址',
    backupDescription: '导出或导入您的存款凭证',

    // Pool stats
    poolStats: '资金池统计',
    totalDeposits: '总存款',
    totalWithdrawals: '总提款',
    poolBalance: '资金池余额',
    queueLength: '队列长度',
    anonymitySet: '匿名集',

    // Deposit form
    depositToPool: '存入资金池',
    sendPrivately: '隐私发送',
    amount: '金额',
    fixedAmount: '每次存款固定为0.01 BNB',
    recipientAddress: '接收地址',
    delayTime: '延迟时间',
    minutes: '分钟',
    confirmDeposit: '确认存款',
    confirmSend: '确认发送',

    // Status messages
    depositing: '存款中',
    sending: '发送中',
    confirmingTransaction: '确认交易中',
    waitingForConfirmation: '等待确认',

    // Success messages
    depositSuccess: '存款成功！',
    sendSuccess: '提款已成功加入队列！',
    withdrawalCompleted: '提款已完成！',
    changeDeposited: '找零已存入！',

    // Error messages
    pleaseConnectWallet: '请先连接您的钱包',
    contractNotDeployed: '合约未部署',
    blockchainNotReady: '区块链连接未就绪',
    invalidRecipientAddress: '无效的接收地址',
    transactionFailed: '交易失败',
    transactionCancelled: '交易已取消',
    withdrawalQueueFailed: '提款队列失败',
    insufficientBalance: '余额不足',

    // Backup section
    backupTitle: '备份与恢复',
    backupButton: '备份存款',
    restoreButton: '从备份恢复',
    noDepositsToBackup: '没有可备份的存款',
    backupSuccessful: '备份下载成功',
    restoreSuccessful: '存款恢复成功',
    invalidBackupFile: '无效的备份文件格式',
    backupSecurityWarningTitle: '重要安全信息',
    backupSecurityWarningText: '您的存款凭证（无效化器和密钥）仅存储在您的浏览器localStorage中。它们永远不会发送到任何服务器或存储在区块链上。如果您清除浏览器数据或使用其他设备，您将需要此备份来访问您的存款。',
    exportBackupTitle: '导出备份',
    exportBackupDescription: '下载包含所有存款凭证的JSON文件。请安全存储 - 任何拥有此文件的人都可以提取您的存款！',
    exportBackupButton: '导出备份文件',
    importBackupTitle: '导入备份',
    importBackupDescription: '从之前导出的备份文件恢复您的存款凭证。',
    importBackupButton: '导入备份文件',
    bestPracticesTitle: '💡 最佳实践',
    bestPractice1: '存款后立即导出备份',
    bestPractice2: '将备份文件存储在安全位置（加密U盘、密码管理器等）',
    bestPractice3: '切勿与任何人分享您的备份文件',
    bestPractice4: '每次存款后创建新的备份',

    // Transaction history
    transactionHistory: '交易历史',
    viewHistory: '查看历史',
    exportHistory: '导出历史',
    noTransactions: '暂无交易',
    depositTransaction: '存款',
    withdrawalTransaction: '提款',
    pending: '待处理',
    deposited: '已存入',
    queued: '队列中',
    completed: '已完成',
    failed: '失败',
    processing: '处理中',
    transactions: '笔交易',
    transaction: '笔交易',
    sortedByNewest: '按最新排序',
    loadingFromBlockchain: '从区块链加载中...',
    fetchingRealTimeStatus: '获取实时交易状态',
    noTransactionHistory: '无交易历史',
    transactionsWillAppear: '您已完成和待处理的交易将显示在这里',
    commitment: '承诺',
    type: '类型',
    timeRemaining: '剩余时间',
    viewDeposit: '查看存款',
    viewQueue: '查看队列',
    viewWithdrawal: '查看提款',
    retryWithdrawal: '重试提款',
    page: '第',
    of: '页，共',
    total: '条',
    refreshingFromBlockchain: '从区块链刷新中...',

    // Privacy features
    privacyFeatures: '隐私功能',
    anonymousDeposits: '匿名存款',
    timeDelayedWithdrawals: '延时提款',
    merkleTreeProofs: '默克尔树证明',

    // How it works modal
    howItWorksTitle: '工作原理',
    step1Title: '1. 生成您的密钥凭证',
    step1Description: '当您发起存款时，应用程序使用浏览器的crypto.getRandomValues()生成两个密码学安全的随机32字节（256位）值。这些是您的无效化器和密钥 - 您存款的钥匙。',
    step2Title: '2. 存入隐私池和默克尔树',
    step2Description: '您将BNB和您的承诺哈希一起发送到智能合约。合约将您的承诺添加到20级二叉默克尔树（支持多达1,048,576次存款）。合约只知道承诺哈希 - 它不知道您的无效化器、密钥或未来的提款地址。',
    step3Title: '3. 用密码学证明排队提款',
    step3Description: '当准备提款时，您提供您的无效化器和密钥。合约通过重新计算承诺哈希来验证所有权，生成无效化器哈希以防止双重支付，并验证您的默克尔证明。然后您的提款将按照您选择的延迟时间排队。',
    step4Title: '4. 自动中继器执行提款',
    step4Description: '延迟到期后，我们的中继服务自动处理提款。它使用中继器的钱包从资金池向您的接收者发送BNB，完全打破您的存款和最终接收者之间的链上联系。',
    previous: '上一步',
    next: '下一步',
    getStarted: '开始使用',

    // How it works visual labels
    nullifier: '无效化器',
    secret: '密钥',
    commitmentHash: '承诺哈希（公开）',
    storedOnBlockchain: '存储在区块链上',
    provesOwnership: '证明所有权而不泄露身份',
    note: '注意',
    credentialsStoredLocally: '这些凭证仅存储在您的浏览器localStorage中。切勿分享它们，否则您将失去资金！',
    privacyNote: '隐私说明',
    blockchainOnlySees: '区块链仅看到：[钱包地址] → [承诺哈希]。您的无效化器和密钥在浏览器中保持私密。',
    commitmentVerified: '承诺已验证',
    notDoubleSpent: '未双重支付',
    merkleProof: '默克尔证明（20个哈希）',
    inPool: '在资金池中',
    queuedCheckmark: '已排队 ✓',
    withdrawalQueued: '提款已排队 - 与存款人无链上联系！',
    automatedProcessing: '自动处理',
    relayerChecksQueue: '中继器每60秒检查队列',
    callsProcessWithdrawals: '延迟后调用processWithdrawals()',
    transfersToRecipient: '向接收者转账0.0996 BNB',
    marksNullifierSpent: '标记无效化器为已使用',
    pool: '资金池',
    relayer: '中继器',
    privacyAchieved: '隐私达成！',
    sentFromRelayer: '从中继器钱包发送（不是您的）',
    noOnchainLink: '与存款人无链上联系',
    untraceableInSet: '在匿名集中不可追踪',
    commitmentInserted: '承诺已插入叶子索引',
    merkleRootUpdated: '默克尔根已在链上更新',
    depositAnonymous: '您的存款现在在资金池中是匿名的',

    // Welcome modal
    welcomeTitle: '欢迎使用AnonBNB',
    welcomeSubtitle: 'BNB链上首个全自动隐私混币器',
    welcomeFeature1Title: '固定0.01 BNB存款',
    welcomeFeature1Description: '所有存款都恰好为0.01 BNB，实现最大匿名性',
    welcomeFeature2Title: '自动中继系统',
    welcomeFeature2Description: '提款在您选择的延迟后自动处理',
    welcomeFeature3Title: '延时隐私保护',
    welcomeFeature3Description: '选择5分钟到24小时的延迟以打破时间分析',
    welcomeFeature4Title: '默克尔树隐私',
    welcomeFeature4Description: '您的存款隐藏在加密默克尔树中',
    welcomeWarningTitle: '严重安全警告',
    welcomeWarningDescription: '您的存款凭证仅存储在您的浏览器中。存款后务必备份，否则您将永久失去资金。',
    welcomeSecurityTitle: '最佳实践',
    welcomeSecurityDescription: '每次存款后立即点击"备份"选项卡，切勿分享您的凭证，并将备份安全地存储在离线位置。',
    welcomeCTA: '我明白了 - 开始使用',

    // Misc
    viewTransaction: '查看交易',
    confirm: '确认',
    cancel: '取消',
    close: '关闭',
    retry: '重试',
    refresh: '刷新',
    loading: '加载中',
    syncing: '同步中',
    yourWallet: '您的钱包',
    smartContract: '智能合约',
    recipient: '接收者',
    status: '状态',

    // Fee discount
    feeDiscountEligible: '符合费用折扣资格',
    feeDiscountNotEligible: '不符合费用折扣资格',
    tokenBalance: '代币余额',
    holdingTokens: '持有代币',
  },
};
