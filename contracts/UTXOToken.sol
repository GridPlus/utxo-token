pragma solidity ^0.4.18;

contract UTXOToken {
  address public admin;
  struct UTXO {
    address owner;
    uint value;
    bytes32 createdBy;
    bytes32 id;
  }
  mapping (bytes32 => UTXO) public utxos;
  uint totalSupply;
  uint decimals;
  string name;
  string symbol;

  event LogCreate(address indexed owner, bytes32 indexed id, uint value);
  event LogSpend(address indexed from, address indexed to, bytes32 oldId, bytes32 newId, uint newValue);

  function getUtxo(bytes32 _id) public constant returns(address, uint, bytes32) {
    UTXO memory utxo = utxos[_id];
    return(utxo.owner, utxo.value, utxo.createdBy);
  }

  function getId(address _to, bytes32 _input) internal constant returns(bytes32) {
    return keccak256(block.number, msg.sender, _to, _input);
  }

  function create(address _to, uint _value) onlyAdmin() public {
    bytes32 id = keccak256(block.number, msg.sender, _to);
    UTXO memory utxo = UTXO(_to, _value, bytes32(0), id);
    utxos[id] = utxo;
    totalSupply += _value;
    LogCreate(_to, id, _value);
  }

  function spend(bytes32 _id, uint _amount, address _to) public {
    require(utxos[_id].owner == msg.sender);
    require(utxos[_id].value >= _amount);

    UTXO memory oldUtxo = utxos[_id];
    delete utxos[_id];

    bytes32 newId1 = getId(_to, _id);
    UTXO memory spend1 = UTXO(_to, _amount, _id, newId1);
    utxos[newId1] = spend1;
    LogSpend(msg.sender, _to, oldUtxo.id, newId1, _amount);

    if (_amount < oldUtxo.value) {
      // slightly mutate the _id value to prevent a collision
      bytes32 newId2 = getId(msg.sender, _id ^ bytes32(1));
      UTXO memory spend2 = UTXO(msg.sender, oldUtxo.value - _amount, _id, newId2);
      utxos[newId2] = spend2;
      LogSpend(msg.sender, _to, oldUtxo.id, newId2, oldUtxo.value - _amount);
    }
  }

  function UTXOToken(uint _decimals, string _name, string _symbol) public {
    decimals = _decimals;
    name = _name;
    symbol = _symbol;
    admin = msg.sender;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin);
    _;
  }
}
