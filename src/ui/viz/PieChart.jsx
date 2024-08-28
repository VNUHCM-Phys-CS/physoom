'user client';
import { useMemo } from "react";
import Plot from "react-plotly.js";

export default function PieChart({ values, labels, title, isDonut }) {
  const data = useMemo(
    () => [
      {
        type: "pie",
        values,
        labels,
        textinfo: "label+percent",
        insidetextorientation: "radial",
        hole: isDonut?.4:undefined,
      },
    ],
    [values, labels]
  );

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)', // Transparent background
    plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent background for the plotting area
    autosize: true,
    title,
    margin: {"t": 0, "b": 0, "l": 0, "r": 0},
    showlegend: false
  };
  return <div className="w-full h-full">
      <Plot data={data} layout={layout} useResizeHandler={true} style={{ width: '100%', height: '100%' }} config={{ responsive: true }} />
    </div>;
}
