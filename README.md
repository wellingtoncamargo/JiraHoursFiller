# ⏱️ Extensão Jira Hours – Registro Automático de Horas

O **Jira Hours** é uma extensão para navegadores baseada em **Chrome Extensions (Manifest V3)** que facilita o preenchimento da planilha de horas trabalhadas no **Jira**.  

Com ela, você consegue registrar rapidamente suas horas em tarefas do Jira sem precisar abrir manualmente a tela de *Worklog*.  

---

## 🔧 Funcionalidades

- ✅ **Registro rápido de horas**: informe a tarefa e a quantidade de horas gastas.  
- 📅 **Suporte a intervalo de datas**: escolha uma data inicial e final para registrar múltiplos dias de uma vez.  
- 🔘 **Switch para usar a data atual**: ative o botão e registre direto apenas no dia de hoje.  
- 🎉 **Integração com feriados nacionais (BrasilAPI)**: evita lançar horas em feriados automaticamente.  
- 📆 **Correção de timezone**: garante que as horas sejam lançadas no dia correto, sem cair em “ontem”.  
- 🚫 **Filtro inteligente de datas inválidas**: ignora dias fora do período ou incorretos.  

---

## 🖥️ Como funciona

1. Abra o popup da extensão.  
2. Informe:  
   - **Tarefa** (`Ex: DEV-123`)  
   - **Horas** (`Ex: 2`)  
   - **Intervalo de datas** ou ative o botão para “usar data atual”.  
3. Clique em **Registrar**.  
4. A extensão preenche automaticamente os campos no Jira (ou via API em versões futuras).  

---

## ⚙️ Tecnologias utilizadas

- **JavaScript (ES6+)**  
- **Manifest V3 (Chrome Extensions API)**  
- **BrasilAPI (feriados nacionais)**  
- **HTML + CSS (popup da extensão)**  

---

## 🚀 Futuras melhorias

- 🔑 Integração direta com **Jira REST API** (com autenticação via token).  
- 📊 Relatório de horas já registradas.  
- ⚡ Configurações personalizadas de feriados (regionais/empresa).  
- 🛠️ Compatibilidade com Firefox.  
