declare module '@react-email/components' {
  import { ReactNode } from 'react';

  interface BaseProps {
    children?: ReactNode;
    style?: React.CSSProperties;
  }

  export function Body(props: BaseProps): JSX.Element;
  export function Container(props: BaseProps): JSX.Element;
  export function Head(props: BaseProps): JSX.Element;
  export function Heading(props: BaseProps): JSX.Element;
  export function Hr(props: BaseProps): JSX.Element;
  export function Html(props: BaseProps): JSX.Element;
  export function Preview(props: BaseProps): JSX.Element;
  export function Section(props: BaseProps): JSX.Element;
  export function Text(props: BaseProps): JSX.Element;
} 