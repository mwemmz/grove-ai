import type { HyperframesPlayer } from '@hyperframes/player';
import type { DetailedHTMLProps, HTMLAttributes, Ref } from 'react';

type PlayerProps = DetailedHTMLProps<HTMLAttributes<HyperframesPlayer>, HyperframesPlayer> & {
  ref?: Ref<HyperframesPlayer>;
  src?: string;
  width?: number;
  height?: number;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  'disable-click-to-play'?: boolean;
  'audio-locked'?: boolean;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'hyperframes-player': PlayerProps;
    }
  }
}
