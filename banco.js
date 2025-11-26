import { open, ANDROID_DATABASE_PATH } from '@op-engineering/op-sqlite';

const db = open({ name: 'agenda.db', location: ANDROID_DATABASE_PATH });

const Banco = {
  initDB: async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS compromissos (
        id INTEGER PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        titulo TEXT NOT NULL,
        hora TEXT NOT NULL,
        categoria TEXT NOT NULL,
        descricao TEXT
      );
    `;
    await db.execute(query);
    return true;
  },

  adicionarCompromisso: async (data, titulo, hora, categoria, descricao) => {
    const query = `
      INSERT INTO compromissos (data, titulo, hora, categoria, descricao)
      VALUES (?, ?, ?, ?, ?);
    `;
    const result = await db.execute(query, [data, titulo, hora, categoria, descricao]);
    return result.insertId;
  },

  removerCompromisso: async (id) => {
    const query = `DELETE FROM compromissos WHERE id = ?;`;
    const result = await db.execute(query, [id]);
    return result.rowsAffected;
  },

  atualizarCompromisso: async (id, data, titulo, hora, categoria, descricao) => {
    console.log('[Banco] atualizarCompromisso:', { id, data, titulo, hora, categoria, descricao });
    const query = `
      UPDATE compromissos
      SET data = ?, titulo = ?, hora = ?, categoria = ?, descricao = ?
      WHERE id = ?;
    `;
    const result = await db.execute(query, [data, titulo, hora, categoria, descricao, id]);
    console.log('[Banco] atualizarCompromisso: resultado', result);
    return result.rowsAffected;
  },

  getCompromissos: async () => {
    const query = `SELECT * FROM compromissos;`;
    const result = await db.execute(query);
    let rows = result.rows;
    let data;
    if (rows._array) {
      data = rows._array;
    } else if (Array.isArray(rows)) {
      data = rows;
    } else {
      data = Array.from(rows);
    }
    return data;
  },
};

export default Banco;
