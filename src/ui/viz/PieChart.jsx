import { useMemo } from "react";
import Plot from "react-plotly.js";

export default function PieChart({ values, labels, title }) {
  const data = useMemo(
    () => [
      {
        type: "pie",
        values,
        labels,
        textinfo: "label+percent",
        textposition: "outside",
      },
    ],
    [values, labels]
  );

  const layout = {
    autosize: true,
    title,
    width: "100%",
    margin: { l: 0, r: 0, b: 0, t: 0 },
  };
  return <Plot data={data} layout={layout} useResizeHandler />;
}
