import { common, createLowlight } from 'lowlight'

/** Shared lowlight instance with the common language grammars registered. */
export const lowlight = createLowlight(common)

/** Languages surfaced in the code-block language picker. */
export const CODE_LANGUAGES: { label: string; value: string }[] = [
  { label: 'Plain text', value: 'plaintext' },
  { label: 'Python', value: 'python' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSON', value: 'json' },
  { label: 'Bash', value: 'bash' },
  { label: 'SQL', value: 'sql' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'C', value: 'c' },
  { label: 'C++', value: 'cpp' },
  { label: 'Java', value: 'java' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'xml' },
  { label: 'CSS', value: 'css' },
]
