const fs = require('fs');
const path = require('path');

const files = [
  {
    path: 'src/components/worker/WorkerAvailabilityCard.tsx',
    target: "import { fontFamily } from '../../design/typography';",
    repl: "import { fontFamily } from '../../design/typography';\nimport { colors, palette } from '../../design/colors';",
  },
  {
    path: 'src/components/worker/WorkerProfileStickyFooter.tsx',
    target: "import { fontFamily } from '../../design/typography';",
    repl: "import { fontFamily } from '../../design/typography';\nimport { colors, palette } from '../../design/colors';",
  },
  {
    path: 'src/components/worker/WorkerStats.tsx',
    target: "import { fontFamily } from '../../design/typography';",
    repl: "import { fontFamily } from '../../design/typography';\nimport { colors, palette } from '../../design/colors';",
  },
  {
    path: 'src/components/chat/ConversationRow.tsx',
    target: "import { fontFamily } from '../../design/typography';",
    repl: "import { fontFamily } from '../../design/typography';\nimport { colors, palette } from '../../design/colors';",
  },
  {
    path: 'src/components/chat/ConversationTabs.tsx',
    target: "import { fontFamily } from '../../design/typography';",
    repl: "import { fontFamily } from '../../design/typography';\nimport { colors, palette } from '../../design/colors';",
  },
  {
    path: 'src/components/chat/MessagesHeader.tsx',
    target: "import { fontFamily } from '../../design/typography';",
    repl: "import { fontFamily } from '../../design/typography';\nimport { colors, palette } from '../../design/colors';",
  },
];

files.forEach(({ path: relPath, target, repl }) => {
  const full = path.join(process.cwd(), relPath);
  let content = fs.readFileSync(full, 'utf8');
  if (content.includes(target)) {
    content = content.replace(target, repl);
    fs.writeFileSync(full, content, 'utf8');
    console.log('Fixed import in:', relPath);
  } else {
    console.log('Target not found in:', relPath);
  }
});
