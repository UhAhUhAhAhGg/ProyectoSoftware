import React from 'react';
import PerfilCard from './PerfilCard';
import styles from './Registro.module.css';

const Registro = () => {
  return (
    <div className={styles.registro}>
      <h1>Registro</h1>
      <PerfilCard />
    </div>
  );
};

export default Registro;