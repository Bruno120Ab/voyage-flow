import { useEffect, useMemo, useState } from "react";
import {
Target,
MapPinned,
TrendingUp,
Bus,
Trash2,
Plus,
Trophy,
Clock,
} from "lucide-react";

type Linha = {
id: string;
origem: string;
destino: string;
valor: number;
prioridade: number;
};

export default function MetasPassagens() {
const [metaDia, setMetaDia] =
useState(12000);

const [linhas, setLinhas] =
useState<Linha[]>([]);

const [form, setForm] =
useState({
origem: "",
destino: "",
valor: "",
prioridade: "1",
});

useEffect(() => {
const saved =
localStorage.getItem(
"painel-passagens"
);

if (!saved) return;

const parsed =
JSON.parse(saved);

setMetaDia(
parsed.metaDia
);

setLinhas(
parsed.linhas
);
}, []);

useEffect(() => {
localStorage.setItem(
"painel-passagens",

JSON.stringify({
metaDia,
linhas,
})
);
}, [
metaDia,
linhas,
]);

function adicionar() {
if (
!form.origem ||
!form.destino ||
!form.valor
)
return;

setLinhas((old) => [
{
id:
Date.now() +
"",
origem:
form.origem,
destino:
form.destino,
valor:
Number(
form.valor
),
prioridade:
Number(
form.prioridade
),
},

...old,
]);

setForm({
origem: "",
destino: "",
valor: "",
prioridade:
"1",
});
}

function excluir(
id: string
) {
setLinhas((x) =>
x.filter(
(v) =>
v.id !== id
)
);
}

const plano =
useMemo(() => {
if (!linhas.length)
return [];

const totalPeso =
linhas.reduce(
(a, b) =>
a +
b.prioridade,
0
);

return linhas.map(
(r) => {
const pct =
r.prioridade /
totalPeso;

const meta =
metaDia *
pct;

const qtd =
Math.ceil(
meta /
r.valor
);

return {
...r,

pct,

meta,

qtd,

hora:
(
qtd /
12
).toFixed(
1
),

receita:
qtd *
r.valor,
};
}
);
}, [
metaDia,
linhas,
]);

const total =
plano.reduce(
(a, b) =>
a +
b.receita,
0
);

const totalPassagens =
plano.reduce(
(a, b) =>
a +
b.qtd,
0
);

const top =
[...plano].sort(
(a, b) =>
b.meta -
a.meta
)[0];

return (
<div
className="
min-h-screen
bg-gradient-to-br
from-zinc-950
via-zinc-900
to-black
text-white
p-8
"
>

<div
className="
max-w-7xl
mx-auto
space-y-8
"
>

<div
className="
rounded-3xl
p-8
bg-gradient-to-r
from-yellow-500
to-amber-600
text-black
shadow-2xl
"
>

<div
className="
flex
justify-between
flex-wrap
gap-6
"
>

<div>

<p>
META DIÁRIA
</p>

<h1
className="
text-6xl
font-black
"
>
R$
{metaDia.toLocaleString(
"pt-BR"
)}
</h1>

<p>
Planejamento
automático
por destino
</p>

</div>

<div>

<input
type="number"
value={
metaDia
}
onChange={(
e
)=>
setMetaDia(
Number(
e
.target
.value
)
)
}
className="
bg-white
text-black
rounded-xl
px-5
py-3
text-2xl
"
/>

</div>

</div>

</div>

<div
className="
grid
md:grid-cols-4
gap-5
"
>

<KPI
icon={
<Target />
}
title="Receita"

value={`R$ ${total.toLocaleString(
"pt-BR"
)}`}
/>

<KPI
icon={
<Bus />
}
title="Passagens"

value={
totalPassagens
}
/>

<KPI
icon={
<Trophy />
}
title="Principal"

value={
top?.destino ||
"-"
}
/>

<KPI
icon={
<Clock />
}
title="Hora"

value={(
totalPassagens /
12
).toFixed(
1
)}
/>

</div>

<div
className="
rounded-3xl
bg-white/5
border
border-white/10
p-6
"
>

<h2
className="
text-2xl
mb-5
font-bold
"
>
Adicionar Linha
</h2>

<div
className="
grid
md:grid-cols-5
gap-3
"
>

<Input
placeholder="Origem"
value={
form.origem
}
set={
(v)=>
setForm({
...form,
origem:
v,
})
}
/>

<Input
placeholder="Destino"
value={
form.destino
}
set={
(v)=>
setForm({
...form,
destino:
v,
})
}
/>

<Input
placeholder="Valor"
value={
form.valor
}
set={
(v)=>
setForm({
...form,
valor:
v,
})
}
/>

<Input
placeholder="Prioridade"
value={
form.prioridade
}
set={
(v)=>
setForm({
...form,
prioridade:
v,
})
}
/>

<button
onClick={
adicionar
}
className="
rounded-xl
bg-yellow-500
text-black
font-bold
"
>
<Plus />
</button>

</div>

</div>

<div
className="
grid
gap-5
"
>

{plano.map(
(
r
)=>(
<div
key={
r.id
}
className="
rounded-3xl
bg-white/5
backdrop-blur
p-6
border
border-white/10
"
>

<div
className="
flex
justify-between
"
>

<div>

<h2
className="
text-3xl
font-black
"
>

<MapPinned />

{
r.origem
}

→

{
r.destino
}

</h2>

<p>
Passagem
R$
{
r.valor
}
</p>

</div>

<button
onClick={() =>
excluir(
r.id
)
}
>

<Trash2 />

</button>

</div>

<div
className="
grid
grid-cols-4
gap-4
mt-8
"
>

<Metric
title="Meta"

value={`R$ ${r.meta.toFixed(
0
)}`}
/>

<Metric
title="Vender"

value={`${r.qtd}`}
/>

<Metric
title="Hora"

value={`${r.hora}`}
/>

<Metric
title="Receita"

value={`R$ ${r.receita}`}
/>

</div>

<div
className="
mt-5
"
>

<div
className="
h-3
rounded-full
bg-white/10
overflow-hidden
"
>

<div
className="
h-full
bg-yellow-500
"
style={{
width:
`${r.pct * 100}%`,
}}
/>

</div>

</div>

</div>
)
)}

</div>

</div>

</div>
);
}

function KPI({
title,
value,
icon,
}: any) {
return (
<div
className="
rounded-3xl
bg-white/5
border
border-white/10
p-6
"
>
{icon}
<p>{title}</p>
<h2
className="
text-3xl
font-bold
"
>
{value}
</h2>
</div>
);
}

function Metric({
title,
value,
}: any) {
return (
<div>
<p
className="
text-xs
opacity-60
"
>
{title}
</p>

<p
className="
text-2xl
font-bold
"
>
{value}
</p>
</div>
);
}

function Input({
placeholder,
value,
set,
}: any) {
return (
<input
className="
bg-black/40
rounded-xl
p-4
"
placeholder={
placeholder
}
value={
value
}
onChange={(
e
)=>
set(
e.target
.value
)
}
/>
);
}