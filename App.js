import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import moment from 'moment';
import 'moment/locale/pt-br';

import Banco from './banco';

moment.locale('pt-br');

const categorias = {
  visita: { label: 'Visita', color: 'blue' },
  reuniao: { label: 'Reunião', color: 'green' },
  inspecao: { label: 'Inspeção', color: 'purple' },
};

function validarHora(hora) {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(hora);
}

function HomeScreen({ navigation }) {
  const [agenda, setAgenda] = useState({});
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [titulo, setTitulo] = useState('');
  const [hora, setHora] = useState('');
  const [categoria, setCategoria] = useState('visita');
  const [descricao, setDescricao] = useState('');
  const [reloadFlag, setReloadFlag] = useState(false);

  useEffect(() => {
    (async () => {
      await Banco.initDB();
      const compromissos = await Banco.getCompromissos();
      const novaAgenda = {};
      compromissos.forEach(item => {
        if (!novaAgenda[item.data]) novaAgenda[item.data] = [];
        novaAgenda[item.data].push({
          id: item.id.toString(),
          titulo: item.titulo,
          hora: item.hora,
          categoria: item.categoria,
          descricao: item.descricao,
        });
      });
      setAgenda(novaAgenda);
    })();
  }, [reloadFlag]);

  const adicionarCompromisso = async () => {
    if (titulo.trim() === '' || dataSelecionada === '' || hora.trim() === '') {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios.');
      return;
    }
    if (!validarHora(hora)) {
      Alert.alert('Hora inválida', 'Formato deve ser HH:MM');
      return;
    }

    try {
      await Banco.adicionarCompromisso(
        dataSelecionada,
        titulo,
        hora,
        categoria,
        descricao
      );
      setReloadFlag(!reloadFlag);
      setTitulo('');
      setHora('');
      setCategoria('visita');
      setDescricao('');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível adicionar compromisso.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>📅 Minha Agenda</Text>

      <Calendar
        onDayPress={day => setDataSelecionada(day.dateString)}
        markedDates={{
          ...Object.keys(agenda).reduce((acc, date) => {
            acc[date] = { marked: true, dotColor: 'blue' };
            return acc;
          }, {}),
          ...(dataSelecionada
            ? { [dataSelecionada]: { selected: true, selectedColor: 'orange' } }
            : {}),
        }}
        theme={{
          todayTextColor: 'red',
          selectedDayBackgroundColor: 'orange',
          arrowColor: 'orange',
          monthTextColor: 'black',
          textMonthFontWeight: 'bold',
        }}
        firstDay={1}
      />

      <Button
        title="Ver todos os compromissos"
        onPress={() => navigation.navigate('TodosCompromissos')}
      />

      {dataSelecionada !== '' && (
        <>
          <Text style={styles.subHeader}>
            Compromissos em {moment(dataSelecionada).format('DD/MM/YYYY')}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Título"
            value={titulo}
            onChangeText={setTitulo}
          />
          <TextInput
            style={styles.input}
            placeholder="Hora (ex: 14:30)"
            value={hora}
            keyboardType="numeric"
            onChangeText={text => {
              const onlyNums = text.replace(/\D/g, '').slice(0, 4);
              let formatted = onlyNums;
              if (onlyNums.length >= 3) {
                formatted = `${onlyNums.slice(0, 2)}:${onlyNums.slice(2)}`;
              }
              setHora(formatted);
            }}
            maxLength={5}
          />
          <View style={styles.pickerContainer}>
            <Text>Categoria:</Text>
            <Picker selectedValue={categoria} onValueChange={setCategoria}>
              {Object.entries(categorias).map(([key, cat]) => (
                <Picker.Item label={cat.label} value={key} key={key} />
              ))}
            </Picker>
          </View>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Descrição (opcional)"
            value={descricao}
            onChangeText={setDescricao}
            multiline
          />
          <Button title="Adicionar" onPress={adicionarCompromisso} />
        </>
      )}
    </SafeAreaView>
  );
}

function TodosCompromissosScreen({ navigation }) {
  const [compromissos, setCompromissos] = useState([]);
  const [editing, setEditing] = useState(null); // objeto sendo editado

  const loadCompromissos = async () => {
    const todos = await Banco.getCompromissos();
    setCompromissos(todos);
  };

  useEffect(() => {
    loadCompromissos();
  }, []);

  const salvarEdicao = async () => {
    if (!editing) return;
    const { id, data, titulo, hora, categoria, descricao } = editing;
    if (titulo.trim() === '' || hora.trim() === '') {
      Alert.alert('Erro', 'Título e hora são obrigatórios.');
      return;
    }
    if (!validarHora(hora)) {
      Alert.alert('Erro', 'Formato da hora inválido.');
      return;
    }

    try {
      await Banco.atualizarCompromisso(id, data, titulo, hora, categoria, descricao);
      setEditing(null);
      loadCompromissos();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a edição.');
    }
  };

  const deletar = async (id) => {
    Alert.alert('Confirmar', 'Tem certeza que quer excluir este compromisso?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await Banco.removerCompromisso(id);
          loadCompromissos();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Todos os Compromissos</Text>

      {editing ? (
        <View style={styles.editContainer}>
          <Text>Editando compromisso</Text>
          <TextInput
            style={styles.input}
            placeholder="Título"
            value={editing.titulo}
            onChangeText={text => setEditing({ ...editing, titulo: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Hora"
            value={editing.hora}
            onChangeText={text => setEditing({ ...editing, hora: text })}
            maxLength={5}
          />
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={editing.categoria}
              onValueChange={value => setEditing({ ...editing, categoria: value })}
            >
              {Object.entries(categorias).map(([key, cat]) => (
                <Picker.Item label={cat.label} value={key} key={key} />
              ))}
            </Picker>
          </View>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Descrição"
            value={editing.descricao}
            onChangeText={text => setEditing({ ...editing, descricao: text })}
            multiline
          />
          <Button title="Salvar" onPress={salvarEdicao} />
          <Button title="Cancelar" onPress={() => setEditing(null)} />
        </View>
      ) : (
        <FlatList
          data={compromissos}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.item, { borderLeftColor: categorias[item.categoria].color }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitulo}>{item.titulo}</Text>
                <Text style={styles.itemHora}>{item.data} — {item.hora}</Text>
                <Text style={{ color: categorias[item.categoria].color }}>
                  {categorias[item.categoria].label}
                </Text>
                {item.descricao ? <Text style={{ marginTop: 4 }}>{item.descricao}</Text> : null}
              </View>
              <View style={styles.buttonsRow}>
                <Button title="Editar" onPress={() => setEditing(item)} />
                <Button title="Excluir" onPress={() => deletar(item.id)} color="red" />
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Agenda" component={HomeScreen} />
        <Stack.Screen name="TodosCompromissos" component={TodosCompromissosScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f2f2f2' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  subHeader: { fontSize: 18, fontWeight: '600', marginVertical: 10 },
  input: { backgroundColor: 'white', padding: 10, borderRadius: 6, borderColor: '#ccc', borderWidth: 1, marginBottom: 10 },
  pickerContainer: { marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, marginBottom: 8, borderRadius: 5 },
  itemTitulo: { fontSize: 16 },
  itemHora: { fontSize: 14, color: '#555' },
  buttonsRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  editContainer: { marginBottom: 20 },
});
