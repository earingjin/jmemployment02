import type { ProgramDetailBlock } from '../data/programs';

// 표현만 분류하며 원본 블록과 문장 순서를 유지한다.
function blockKind(heading: string) {
  if (heading.startsWith('지원내용') || /수당|취업활동비용/.test(heading)) return 'benefit';
  if (heading === '참여자격') return 'eligibility';
  if (heading === '신청방법') return 'steps';
  if (heading === '신청 창구') return 'office';
  return 'info';
}

export function ProgramDetailBlocks({ blocks, headingLevel = 2 }: {
  blocks: ProgramDetailBlock[];
  headingLevel?: 2 | 4;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h4';
  return (
    <div className="program-detail-blocks">
      {blocks.map((block, i) => {
        const kind = blockKind(block.heading);
        const List = kind === 'steps' ? 'ol' : 'ul';
        return (
          <article className={'program-detail-card program-detail-card--' + kind} key={i}>
            <Heading className="program-detail-heading">{block.heading}</Heading>
            <List className="program-detail-lines">
              {block.lines.map((line, j) => <li key={j}>{line}</li>)}
            </List>
          </article>
        );
      })}
    </div>
  );
}
