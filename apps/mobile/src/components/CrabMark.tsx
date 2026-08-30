import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

/** The Crab brand mark shared with the web sidebar and application icons. */
export function CrabMark(props: { readonly height: number; readonly color: ColorValue }) {
  return (
    <Svg accessibilityLabel="Crab" height={props.height} width={props.height} viewBox="0 0 128 128">
      <Path
        clipRule="evenodd"
        d="M49.5 40C47.5 27.5 38 18 25.5 18H13L21.5 26L17 36L28 33C30.5 40.5 36 46.5 43.5 50L49.5 40ZM78.5 40C80.5 27.5 90 18 102.5 18H115L106.5 26L111 36L100 33C97.5 40.5 92 46.5 84.5 50L78.5 40ZM33.5 61L16 57L7 66L16 75L34 73L33.5 61ZM94.5 61L112 57L121 66L112 75L94 73L94.5 61ZM40 78L23 84L17 98L31 93L47 86L40 78ZM88 78L105 84L111 98L97 93L81 86L88 78ZM64 35C46.5 35 34 43.5 34 58V69C34 86 46.5 96 64 96C81.5 96 94 86 94 69V58C94 43.5 81.5 35 64 35ZM48 55C48 51.6863 50.6863 49 54 49C57.3137 49 60 51.6863 60 55C60 58.3137 57.3137 61 54 61C50.6863 61 48 58.3137 48 55ZM68 55C68 51.6863 70.6863 49 74 49C77.3137 49 80 51.6863 80 55C80 58.3137 77.3137 61 74 61C70.6863 61 68 58.3137 68 55Z"
        fill={props.color}
        fillRule="evenodd"
      />
    </Svg>
  );
}
