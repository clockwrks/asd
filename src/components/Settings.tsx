import { React, components } from "enmity/metro/common/react";
import { settings } from "enmity/api";

const { TextInput, FormRow } = components;

export default () => {
  const [subjectUserId, setSubjectUserId] = React.useState<string>(
    settings.get("imposter", "subjectUserId", "") as string
  );
  const [targetUserId, setTargetUserId] = React.useState<string>(
    settings.get("imposter", "targetUserId", "") as string
  );

  const saveSubjectId = (value: string) => {
    setSubjectUserId(value);
    settings.set("imposter", "subjectUserId", value);
  };

  const saveTargetId = (value: string) => {
    setTargetId(value);
    settings.set("imposter", "targetUserId", value);
  };

  return (
    <React.Fragment>
      <FormRow label="Subject User ID (To Copy)">
        <TextInput
          placeholder="e.g., 235148962103953408"
          value={subjectUserId}
          onChangeText={saveSubjectId}
        />
      </FormRow>
      <FormRow label="Target User ID (To Spook)">
        <TextInput
          placeholder="e.g., 235148962103953408"
          value={targetUserId}
          onChangeText={saveTargetId}
        />
      </FormRow>
    </React.Fragment>
  );
};
