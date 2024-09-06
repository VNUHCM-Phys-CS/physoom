import { Checkbox } from "@nextui-org/react";
import React from "react";

export default function StageButton({checked,icon,falseText,trueText,onValueChange,...props}) {
  // const [isSelected, setIsSelected] = React.useState(checked);
  // const _onValueChange = (isSelected)=>{
  //   setIsSelected(isSelected);
  //   onValueChange(isSelected)
  // }
  return (
    <Checkbox isSelected={checked} icon={icon} onValueChange={onValueChange} {...props}>{checked?trueText:falseText}</Checkbox>
  );
}
