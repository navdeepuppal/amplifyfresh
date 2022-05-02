import React, { useState, useEffect } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";

import { DataStore } from "aws-amplify";
import { Todo } from "./models";
import Constants from "expo-constants";
import * as SQLite from "expo-sqlite";

function openDatabase() {
  if (Platform.OS === "web") {
    return {
      transaction: () => {
        return {
          executeSql: () => {},
        };
      },
    };
  }
  const db = SQLite.openDatabase("db.db");
  return db;
}

const db = openDatabase();

function Items({ done: doneHeading, onPressItem }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        `select * from cart where done = ?;`,
        [doneHeading ? 1 : 0],
        (_, { rows: { _array } }) => setItems(_array)
      );
    });
  }, []);

  const heading = doneHeading ? "Completed" : "Todo";

  if (items === null || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {items.map(({ id, done, value }) => (
        <TouchableOpacity
          key={id}
          onPress={() => onPressItem && onPressItem(id)}
          style={{
            backgroundColor: done ? "#1c9963" : "#fff",
            borderColor: "#000",
            borderWidth: 1,
            padding: 8,
          }}
        >
          <Text style={{ color: done ? "#fff" : "#000" }}>{value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Home() {
  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql("drop table cart;");
      tx.executeSql(
        "create table if not exists cart (name text primary key not null, price integer, quantity integer, units text, img text);"
      );
      console.log("Cart table Created");
    });
  }, []);

  return (
    <View style={styles.container}>
      <TodoList />
    </View>
  );
}
const TodoList = () => {
 
  
  const [todos, setTodos] = useState([]);

  const [forceUpdate, forceUpdateId] = useForceUpdate();

  function useForceUpdate() {
    const [value, setValue] = useState(0);
    return [() => setValue(value + 1), value];
  }


  useEffect(() => {
    //query the initial todolist and subscribe to data updates
    const subscription = DataStore.observeQuery(Todo).subscribe((snapshot) => {
      //isSynced can be used to show a loading spinner when the list is being loaded.
      const { items, isSynced } = snapshot;
      setTodos(items);
    });

    //unsubscribe to data updates when component is destroyed so that we don’t introduce a memory leak.
    return function cleanup() {
      subscription.unsubscribe();
    };
  }, []);

  const add = (name, price, units, img) => {
    // is text empty?
    if (name === null || name === "") {
      return false;
    }
    var ifExists = false;
    db.transaction(
      (tx) => {
        tx.executeSql(
          "select * from cart where name = ?",
          [name],
          (_, { rows }) => {
            ifExists = JSON.stringify(rows).includes('"name":"' + name + '"');
            if (ifExists) {
              console.log("Increased");
              tx.executeSql(
                "update cart set quantity = quantity+1 where name = ?",
                [name]
              );
            } else {
              console.log("Inserted");
              tx.executeSql(
                "insert into cart (name, price, quantity, units, img) values (?, ?, ?, ?, ?)",
                [name, price, 1, units, img]
              );
            }
            tx.executeSql("select * from cart", [], (_, { rows }) =>
              console.log(JSON.stringify(rows))
            );
            tx.executeSql(
              "select SUM(price*quantity) as totalPrice from cart",
              [],
              (_, { rows }) => console.log(JSON.stringify(rows)),
              console.log(totalPrice)
              
            );
          }
        );
      },
      null,
      forceUpdate
    );
  };

  const reduce = (name) => {
    // is text empty?
    if (name === null || name === "") {
      return false;
    }
    var quantity = 0;
    db.transaction(
      (tx) => {
        tx.executeSql(
          "select quantity from cart where name = ?",
          [name],
          (_, { rows }) => {
            var str = JSON.stringify(rows);
            quantity = parseInt(
              str.slice(str.indexOf('"quantity":') + 11, str.indexOf("}]"))
            );
            if (quantity > 1) {
              console.log("Decreased");
              tx.executeSql(
                "update cart set quantity = quantity-1 where name = ?",
                [name]
              );
            } else {
              console.log("Deleted");

              tx.executeSql("delete from cart where name = ?", [name]);
            }
            tx.executeSql("select * from cart", [], (_, { rows })
            );
            
            
            
          }
        );
      },
      null,
      forceUpdate
    );
  };



  function fetchQuantity(name) {
    var quantity = 0;
    db.transaction((tx) => {
      tx.executeSql(
        "select quantity from cart where name = ?",
        [name],
        (_, { rows }) => {
          var str = JSON.stringify(rows);
          quantity = parseInt(
            str.slice(str.indexOf('"quantity":') + 11, str.indexOf("}]"))
          );
        }
      );
    }, null);
    return quantity;
  }

  const renderItem = ({ item }) => {
    return (
      <Pressable style={styles.todoContainer}>
        <Image style={{ width: 30, height: 30 }} source={{ uri: item.img }} />
        <Text>
          <Text style={styles.todoHeading}>{item.name}</Text>
          {`\n${item.description}`}
        </Text>

        <Text>
          <Text style={styles.todoHeading}>{item.price}</Text>
        </Text>
        <Text style={styles.strikethrough}>{`\n${item.cutPrice}`}</Text>

        <TouchableOpacity
          onPress={() =>
            add(item.name, item.price, item.units, item.img) && setText(null)
          }
          style={styles.roundButton1}
        >
          <Text>+</Text>
        </TouchableOpacity>

        <Text>{`${fetchQuantity(item.name)}`}</Text>

        <TouchableOpacity
          onPress={() => reduce(item.name) && setText(null)}
          style={styles.roundButton1}
        >
          <Text>-</Text>
        </TouchableOpacity>
      </Pressable>
    );
  };

  
  
var totalPrice =0;

  return (
    <View style={styles.container}>
      <FlatList
        data={todos}
        keyExtractor={({ id }) => id}
        renderItem={renderItem}
      />

      <Text>{totalPrice}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#4696ec",
    paddingTop: Platform.OS === "ios" ? 44 : 0,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    paddingVertical: 16,
    textAlign: "center",
  },
  todoContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 2,
    elevation: 4,
    flexDirection: "row",
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 8,
    shadowOffset: {
      height: 1,
      width: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  todoHeading: {
    fontSize: 20,
    fontWeight: "600",
  },
  checkbox: {
    borderRadius: 2,
    borderWidth: 2,
    fontWeight: "700",
    height: 20,
    marginLeft: "auto",
    textAlign: "center",
    width: 20,
  },
  completedCheckbox: {
    backgroundColor: "#000",
    color: "#fff",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    padding: 16,
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: "gray",
  },
  buttonContainer: {
    alignSelf: "center",
    backgroundColor: "#4696ec",
    borderRadius: 99,
    paddingHorizontal: 8,
  },
  floatingButton: {
    position: "absolute",
    bottom: 44,
    elevation: 6,
    shadowOffset: {
      height: 4,
      width: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  modalInnerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
    padding: 16,
  },
  modalInput: {
    borderBottomWidth: 1,
    marginBottom: 16,
    padding: 8,
  },
  modalDismissButton: {
    marginLeft: "auto",
  },
  modalDismissText: {
    fontSize: 20,
    fontWeight: "700",
  },
  container: {
    backgroundColor: "#fff",
    paddingTop: Constants.statusBarHeight,
  },
  roundButton1: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    padding: 1,
    borderRadius: 0,
    backgroundColor: "white",
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  flexRow: {
    flexDirection: "row",
  },
  input: {
    borderColor: "#4630eb",
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    height: 48,
    margin: 16,
    padding: 8,
  },
  listArea: {
    backgroundColor: "#f0f0f0",
    flex: 1,
    paddingTop: 16,
  },
  sectionContainer: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 18,
    marginBottom: 8,
  },
});
