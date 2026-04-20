// Dynamic Stiffness vs Frequency Chart — Recharts
const StiffnessChart = (() => {
  const { createElement: h } = React;
  const {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
  } = Recharts;

  // Generate realistic dynamic stiffness data for three mount configurations.
  // Dynamic stiffness K*(f) increases with frequency and exhibits a resonance hump.
  function generateData() {
    const data = [];
    for (let f = 10; f <= 1000; f += 10) {
      data.push({
        frequency: f,
        softMount: Math.round(
          120 * (1 + 0.0008 * f) +
          80 * Math.exp(-Math.pow(f - 350, 2) / 8000)
        ),
        mediumMount: Math.round(
          250 * (1 + 0.0006 * f) +
          120 * Math.exp(-Math.pow(f - 500, 2) / 12000)
        ),
        stiffMount: Math.round(
          450 * (1 + 0.0004 * f) +
          150 * Math.exp(-Math.pow(f - 700, 2) / 18000)
        ),
      });
    }
    return data;
  }

  const data = generateData();

  const LINES = [
    { key: 'softMount',   name: 'Soft Mount',   color: '#F87171' },
    { key: 'mediumMount', name: 'Medium Mount',  color: '#4F46E5' },
    { key: 'stiffMount',  name: 'Stiff Mount',   color: '#60A5FA' },
  ];

  function CustomTooltip(props) {
    var active = props.active, payload = props.payload, label = props.label;
    if (!active || !payload || !payload.length) return null;
    return h('div', {
      style: {
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid #E5E5EA',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontSize: '13px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }
    },
      h('p', {
        style: { fontWeight: 600, marginBottom: '6px', color: '#1C1C1E' }
      }, 'Frequency: ' + label + ' Hz'),
      payload.map(function (entry, i) {
        return h('p', {
          key: i,
          style: { color: entry.color, margin: '3px 0' }
        }, entry.name + ': ' + entry.value + ' N/mm');
      })
    );
  }

  function Chart() {
    return h(ResponsiveContainer, { width: '100%', height: 450 },
      h(LineChart, {
        data: data,
        margin: { top: 10, right: 30, left: 20, bottom: 30 }
      },
        h(CartesianGrid, { strokeDasharray: '3 3', stroke: '#F0F0F5' }),
        h(XAxis, {
          dataKey: 'frequency',
          type: 'number',
          domain: [0, 1000],
          tickCount: 11,
          tick: { fontSize: 12, fill: '#8E8E93' },
          label: {
            value: 'Frequency (Hz)',
            position: 'bottom',
            offset: 10,
            style: { fontSize: 13, fill: '#1C1C1E', fontWeight: 500 }
          }
        }),
        h(YAxis, {
          tick: { fontSize: 12, fill: '#8E8E93' },
          label: {
            value: 'Dynamic Stiffness (N/mm)',
            angle: -90,
            position: 'insideLeft',
            offset: -5,
            style: { fontSize: 13, fill: '#1C1C1E', fontWeight: 500, textAnchor: 'middle' }
          }
        }),
        h(Tooltip, { content: CustomTooltip }),
        h(Legend, {
          verticalAlign: 'top',
          height: 36,
          iconType: 'line',
          wrapperStyle: {
            fontSize: '13px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          }
        }),
        LINES.map(function (line) {
          return h(Line, {
            key: line.key,
            type: 'monotone',
            dataKey: line.key,
            name: line.name,
            stroke: line.color,
            strokeWidth: 2.5,
            dot: false,
            activeDot: { r: 5, strokeWidth: 2, fill: '#fff' }
          });
        })
      )
    );
  }

  var mounted = false;

  function mount() {
    if (mounted) {
      // Trigger resize so ResponsiveContainer recalculates when tab becomes visible
      window.dispatchEvent(new Event('resize'));
      return;
    }
    mounted = true;
    var root = document.getElementById('stiffness-chart-root');
    if (root) {
      ReactDOM.createRoot(root).render(h(Chart, null));
    }
  }

  return { mount: mount };
})();
