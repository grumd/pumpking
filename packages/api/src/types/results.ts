import { Result } from 'models/Result';
import { SharedChart } from 'models/SharedChart';
import { ChartInstance } from 'models/ChartInstance';
import { Player } from 'models/Player';

export interface FullResult extends Result, SharedChart, ChartInstance, Player {}
