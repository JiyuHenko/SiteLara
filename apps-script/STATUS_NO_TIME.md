# Apps Script — status `No time`

Este repositório publica apenas o front-end do SiteLara. O painel `/admin` carrega um Google Apps Script externo; portanto, esta alteração precisa ser aplicada no projeto Apps Script correspondente.

## Objetivo

Adicionar o estágio `No time` depois de `Aprovada`, mantendo `Aprovada` como a etapa anterior à entrada efetiva da influenciadora no time LB FIT.

Fluxo esperado:

`Nova` → `Em análise` → `Contatada` → `Aprovada` → `No time`

`Não aprovada` continua disponível como saída independente.

## Code.gs

Substitua:

```js
const STATUS_OPTIONS = ['Nova', 'Em análise', 'Contatada', 'Aprovada', 'Não aprovada'];
```

por:

```js
const STATUS_OPTIONS = ['Nova', 'Em análise', 'Contatada', 'Aprovada', 'No time', 'Não aprovada'];
```

Nenhuma outra alteração é necessária em `adminGetDashboard()` ou `adminUpdateSubmission()`: ambas já usam `STATUS_OPTIONS`, então o novo status passa automaticamente a ser retornado ao painel, contabilizado em `stats` e aceito nas atualizações.

## Admin.html

Adicione a regra visual do novo badge junto às demais regras `.status[data-status=...]`:

```css
.status[data-status="No time"]{background:#e5f7f0;color:#176f50}
```

O filtro e o seletor do modal não precisam de alteração adicional: `populateStatuses()` já recebe a lista de `STATUS_OPTIONS` enviada pelo backend e monta as opções dinamicamente.

## Google Sheets

Não crie coluna nova. Continue usando a coluna `STATUS` existente.

Depois de salvar o novo `Code.gs`, execute **uma vez** a função:

```text
configurarPlanilha()
```

Isso reaplica a validação de dados da coluna `STATUS` usando a lista atualizada e passa a permitir `No time` também diretamente na planilha.

## Publicação

Depois de alterar `Code.gs` e `Admin.html` no Apps Script:

1. Salve os arquivos.
2. Execute `configurarPlanilha()` uma vez.
3. Atualize a implantação existente do Aplicativo da Web, mantendo a mesma URL `/exec`.
4. Recarregue `https://larabiagioni.com.br/admin/`.
5. Abra uma candidata aprovada, altere o status para `No time` e salve.
6. Confirme que o filtro `No time` aparece e que o valor foi persistido na coluna `STATUS`.

Não é necessário alterar `admin/index.html` no GitHub nem criar novas colunas na planilha.
