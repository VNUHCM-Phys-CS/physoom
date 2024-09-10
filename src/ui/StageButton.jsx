// import { Checkbox } from "@nextui-org/react";
import {Button} from "@nextui-org/react";
import React from "react";

export default function StageButton({checked,falseIcon,trueIcon,falseText,trueText,...props}) {
  // const [isSelected, setIsSelected] = React.useState(checked);
  // const _onValueChange = (isSelected)=>{
  //   setIsSelected(isSelected);
  //   onValueChange(isSelected)
  // }
  return (
    <Button startContent={checked?trueIcon:falseIcon} {...props}>{checked?trueText:falseText}</Button>
  );
}
